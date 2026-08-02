// Owner-verification milestone: bank-details attestation (fingerprint,
// password re-auth, automatic invalidation, audit hygiene) and integration
// verification (locking, sanitized outcomes, truthful go-live states).
// All bank values are synthetic fixtures.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    createAdmin,
    authCookieFor,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import IntegrationVerification from '../models/IntegrationVerification.js';
import { config } from '../config/index.js';
import { bankDetailsFingerprint } from '../utils/bankDetails.js';
import { getGoLiveReadiness } from '../services/goLiveService.js';
import { recordGoogleOauthSuccess } from '../services/integrationVerificationService.js';

const app = buildTestApp();

const TEST_IBAN = 'IL530109000000012345678';
const VALID_BANK = {
    enabled: true,
    bankName: 'בנק בדיקה',
    branch: '900',
    accountNumber: '12345678',
    accountName: 'Crystolia Products Ltd',
    iban: TEST_IBAN,
    swift: 'TESTILITXXX',
    bankAddress: 'שדרות הבדיקה 38',
};
const CARD_OFF = { enabled: false, paymentUrl: '' };
const ADMIN_PASSWORD = 'AdminPass1';

async function seedSettings(bank: Record<string, unknown> = VALID_BANK) {
    return Settings.create({
        key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [],
        paymentOptions: { bankTransfer: bank, creditCard: CARD_OFF },
    });
}

beforeAll(async () => {
    await startTestDb();
    await IntegrationVerification.init();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

describe('bank-details fingerprint', () => {
    it('is stable for identical details and ignores surrounding whitespace', () => {
        const a = bankDetailsFingerprint(VALID_BANK);
        const b = bankDetailsFingerprint({ ...VALID_BANK, bankName: ` ${VALID_BANK.bankName} ` });
        expect(a).toMatch(/^[a-f0-9]{64}$/);
        expect(b).toBe(a);
    });

    it('changes when ANY covered field changes', () => {
        const base = bankDetailsFingerprint(VALID_BANK);
        for (const [field, value] of [
            ['bankName', 'בנק אחר'], ['branch', '901'], ['accountNumber', '999'],
            ['accountName', 'Other Ltd'], ['iban', 'IL620108000000099999999'],
            ['swift', 'OTHRILITXXX'], ['bankAddress', 'רחוב אחר 2'],
        ] as const) {
            expect(bankDetailsFingerprint({ ...VALID_BANK, [field]: value }), field).not.toBe(base);
        }
    });
});

describe('POST /api/settings/bank-verification', () => {
    async function admin() {
        return createAdmin();
    }

    it('requires authentication and the admin role', async () => {
        await seedSettings();
        const anon = await request(app).post('/api/settings/bank-verification')
            .send({ password: 'x', fingerprint: 'a'.repeat(64) });
        expect(anon.status).toBe(401);

        const company = await Company.create({ name: 'לקוח', vatNumber: '588000001' });
        const customer = await User.create({
            name: 'לקוח', email: 'cust-verify@example.com', password: 'Password1',
            role: 'customer', company: company._id, isActive: true, registrationStatus: 'approved',
        });
        const forbidden = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', authCookieFor(customer))
            .send({ password: 'Password1', fingerprint: 'a'.repeat(64) });
        expect(forbidden.status).toBe(403);
        expect((await Settings.findOne({ key: 'business' }).lean())?.bankVerification ?? null).toBeNull();

        // Customers never see the verification governance metadata either.
        const settingsForCustomer = await request(app).get('/api/settings')
            .set('Cookie', authCookieFor(customer));
        expect(settingsForCustomer.status).toBe(200);
        expect(settingsForCustomer.body.data.bankVerification).toBeUndefined();
    });

    it('re-authenticates: a wrong password is refused and audited, and nothing is stored', async () => {
        await seedSettings();
        const user = await admin();
        const res = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', authCookieFor(user))
            .send({ password: 'WrongPass1', fingerprint: bankDetailsFingerprint(VALID_BANK) });
        expect(res.status).toBe(401);
        expect((await Settings.findOne({ key: 'business' }).lean())?.bankVerification ?? null).toBeNull();
        const denied = await AuditLog.findOne({ action: 'BANK_VERIFICATION_DENIED' }).lean();
        expect(denied).toBeTruthy();
        expect(JSON.stringify(denied)).not.toContain(TEST_IBAN);
    });

    it('refuses when bank transfer is not configured or the fingerprint is stale', async () => {
        await seedSettings({ ...VALID_BANK, enabled: false });
        const user = await admin();
        const cookie = authCookieFor(user);
        const notConfigured = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', cookie)
            .send({ password: ADMIN_PASSWORD, fingerprint: bankDetailsFingerprint(VALID_BANK) });
        expect(notConfigured.status).toBe(409);

        await Settings.updateOne({ key: 'business' }, { $set: { 'paymentOptions.bankTransfer.enabled': true } });
        const stale = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', cookie)
            .send({ password: ADMIN_PASSWORD, fingerprint: bankDetailsFingerprint({ ...VALID_BANK, branch: '999' }) });
        expect(stale.status).toBe(409);
        expect(stale.body.error || stale.body.message).toMatch(/changed/);
    });

    it('verifies on correct password + matching fingerprint; audit holds the fingerprint but never bank values', async () => {
        await seedSettings();
        const user = await admin();
        const fingerprint = bankDetailsFingerprint(VALID_BANK);
        const res = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', authCookieFor(user))
            .send({ password: ADMIN_PASSWORD, fingerprint });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('verified');

        const stored = await Settings.findOne({ key: 'business' }).lean();
        expect(stored?.bankVerification?.fingerprint).toBe(fingerprint);
        expect(String(stored?.bankVerification?.verifiedBy)).toBe(String(user._id));
        expect(stored?.bankVerification?.verifiedAt).toBeTruthy();

        const audit = await AuditLog.findOne({ action: 'BANK_DETAILS_VERIFIED' }).lean();
        expect(audit?.details?.fingerprint).toBe(fingerprint);
        const auditJson = JSON.stringify(audit);
        expect(auditJson).not.toContain(TEST_IBAN);
        expect(auditJson).not.toContain(VALID_BANK.accountNumber);
        expect(auditJson).not.toContain(VALID_BANK.bankName);

        // payment-status and go-live both report verified.
        const status = await request(app).get('/api/settings/payment-status')
            .set('Cookie', authCookieFor(user));
        expect(status.body.data.bankVerification.status).toBe('verified');
        const readiness = await getGoLiveReadiness();
        expect(readiness.payments.bankVerification).toBe('verified');
    });

    it('refuses for a Google-only account without a password', async () => {
        await seedSettings();
        const googleAdmin = await User.create({
            name: 'מנהל גוגל', email: 'google-admin@example.com',
            password: 'GOOGLE_OAUTH_placeholder123',
            role: 'admin', isActive: true, registrationStatus: 'approved',
            registrationMethod: 'google', googleId: 'g-123',
        });
        const res = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', authCookieFor(googleAdmin))
            .send({ password: 'whatever1A', fingerprint: bankDetailsFingerprint(VALID_BANK) });
        expect(res.status).toBe(409);
        expect(res.body.error || res.body.message).toMatch(/password/i);
    });
});

describe('automatic invalidation on bank-detail change', () => {
    async function verifiedSetup() {
        await seedSettings();
        const user = await createAdmin();
        const cookie = authCookieFor(user);
        const verify = await request(app).post('/api/settings/bank-verification')
            .set('Cookie', cookie)
            .send({ password: ADMIN_PASSWORD, fingerprint: bankDetailsFingerprint(VALID_BANK) });
        expect(verify.status).toBe(200);
        return cookie;
    }

    it('clears the verification and audits when a covered field changes', async () => {
        const cookie = await verifiedSetup();
        const res = await request(app).put('/api/v1/settings')
            .set('Cookie', cookie)
            .send({ paymentOptions: { bankTransfer: { ...VALID_BANK, branch: '901', iban: 'IL360109010000012345678' }, creditCard: CARD_OFF } });
        expect(res.status).toBe(200);
        expect(res.body.data.bankVerification ?? null).toBeNull();
        const invalidated = await AuditLog.findOne({ action: 'BANK_VERIFICATION_INVALIDATED' }).lean();
        expect(invalidated).toBeTruthy();
        expect(JSON.stringify(invalidated)).not.toContain(TEST_IBAN);
        const readiness = await getGoLiveReadiness();
        expect(readiness.payments.bankVerification).toBe('owner_confirmation_required');
    });

    it('preserves the verification when a save leaves the bank fields identical', async () => {
        const cookie = await verifiedSetup();
        const res = await request(app).put('/api/v1/settings')
            .set('Cookie', cookie)
            .send({ minimumOrderAmount: 500, paymentOptions: { bankTransfer: VALID_BANK, creditCard: CARD_OFF } });
        expect(res.status).toBe(200);
        expect(res.body.data.bankVerification?.fingerprint).toBe(bankDetailsFingerprint(VALID_BANK));
        expect(await AuditLog.countDocuments({ action: 'BANK_VERIFICATION_INVALIDATED' })).toBe(0);
    });
});

describe('stale demo credit-card cleanup on save', () => {
    it('clears a demo URL when the card method is saved disabled', async () => {
        const user = await createAdmin();
        const res = await request(app).put('/api/v1/settings')
            .set('Cookie', authCookieFor(user))
            .send({
                paymentOptions: {
                    bankTransfer: { enabled: false },
                    creditCard: { enabled: false, paymentUrl: 'https://business.crystolia.com/he/payment-demo' },
                },
            });
        expect(res.status).toBe(200);
        expect(res.body.data.paymentOptions.creditCard.paymentUrl).toBe('');
        expect(res.body.data.paymentOptions.creditCard.enabled).toBe(false);
    });

    it('keeps a real (non-demo) URL on a disabled card method', async () => {
        const user = await createAdmin();
        const res = await request(app).put('/api/v1/settings')
            .set('Cookie', authCookieFor(user))
            .send({
                paymentOptions: {
                    bankTransfer: { enabled: false },
                    creditCard: { enabled: false, paymentUrl: 'https://pay.example.com/real' },
                },
            });
        expect(res.status).toBe(200);
        expect(res.body.data.paymentOptions.creditCard.paymentUrl).toBe('https://pay.example.com/real');
    });
});

describe('integration verification', () => {
    const originalEmail = { ...config.email };
    const originalSms = { ...config.sms };
    const originalAdminPhone = config.adminPhone;

    beforeEach(() => {
        Object.assign(config.email, {
            provider: 'twilio', apiKey: '', fromAddress: 'no-reply@test.crystolia.com', fromName: 'Crystolia',
        });
        Object.assign(config.sms, { accountSid: 'ACtest', authToken: 'token', fromNumber: '+15550001111', messagingServiceSid: '' });
        config.adminPhone = '+15550009999';
    });
    afterEach(() => {
        Object.assign(config.email, originalEmail);
        Object.assign(config.sms, originalSms);
        config.adminPhone = originalAdminPhone;
        vi.restoreAllMocks();
    });

    async function adminCookie() {
        return authCookieFor(await createAdmin());
    }

    it('requires admin auth, a known key and explicit confirmation', async () => {
        const anon = await request(app).post('/api/v1/system/integrations/operational_email/verify').send({ confirm: true });
        expect(anon.status).toBe(401);

        const cookie = await adminCookie();
        const unknown = await request(app).post('/api/v1/system/integrations/webhooks/verify')
            .set('Cookie', cookie).send({ confirm: true });
        expect(unknown.status).toBe(400);
        const unconfirmed = await request(app).post('/api/v1/system/integrations/operational_email/verify')
            .set('Cookie', cookie).send({});
        expect(unconfirmed.status).toBe(400);
    });

    it('records a sanitized success for operational email (no recipient stored or returned)', async () => {
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: {} });
        const cookie = await adminCookie();
        const res = await request(app).post('/api/v1/system/integrations/operational_email/verify')
            .set('Cookie', cookie).send({ confirm: true });
        expect(res.status).toBe(200);
        expect(res.body.data.result).toBe('success');
        expect(post).toHaveBeenCalledTimes(1);

        const doc = await IntegrationVerification.findOne({ key: 'operational_email' }).lean();
        expect(doc?.lastResult).toBe('success');
        expect(doc?.verifiedAt).toBeTruthy();
        const persisted = JSON.stringify(doc);
        expect(persisted).not.toContain('admin@test.crystolia.com');
        expect(persisted).not.toContain('token');
        expect(JSON.stringify(res.body)).not.toContain('admin@test.crystolia.com');

        const audit = await AuditLog.findOne({ action: 'INTEGRATION_VERIFICATION_ATTEMPT' }).lean();
        expect(audit?.details?.result).toBe('success');
        expect(JSON.stringify(audit?.details)).not.toContain('admin@test.crystolia.com');
    });

    it('categorizes provider rejection and network failures without leaking details', async () => {
        const cookie = await adminCookie();
        const rejection = Object.assign(new Error('Request failed with status code 401'), {
            isAxiosError: true, response: { status: 401 },
        });
        vi.spyOn(axios, 'post').mockRejectedValueOnce(rejection);
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

        const failed = await request(app).post('/api/v1/system/integrations/admin_sms/verify')
            .set('Cookie', cookie).send({ confirm: true });
        expect(failed.status).toBe(200);
        expect(failed.body.data.result).toBe('failed');
        expect(failed.body.data.failureCategory).toBe('provider_rejected');
        const doc = await IntegrationVerification.findOne({ key: 'admin_sms' }).lean();
        expect(doc?.failureCategory).toBe('provider_rejected');
        expect(JSON.stringify(doc)).not.toContain('+15550009999');
    });

    it('records configuration_missing without any provider call', async () => {
        config.adminPhone = '';
        const post = vi.spyOn(axios, 'post');
        const cookie = await adminCookie();
        const res = await request(app).post('/api/v1/system/integrations/admin_sms/verify')
            .set('Cookie', cookie).send({ confirm: true });
        expect(res.status).toBe(200);
        expect(res.body.data.result).toBe('failed');
        expect(res.body.data.failureCategory).toBe('configuration_missing');
        expect(post).not.toHaveBeenCalled();
    });

    it('locks out a second attempt inside the window — at most one provider call', async () => {
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: {} });
        const cookie = await adminCookie();
        const [a, b] = await Promise.all([
            request(app).post('/api/v1/system/integrations/operational_email/verify')
                .set('Cookie', cookie).send({ confirm: true }),
            request(app).post('/api/v1/system/integrations/operational_email/verify')
                .set('Cookie', cookie).send({ confirm: true }),
        ]);
        const statuses = [a.status, b.status].sort();
        expect(statuses).toEqual([200, 429]);
        expect(post).toHaveBeenCalledTimes(1);

        const third = await request(app).post('/api/v1/system/integrations/operational_email/verify')
            .set('Cookie', cookie).send({ confirm: true });
        expect(third.status).toBe(429);
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('maps go-live states truthfully: verified, expired, failed, passive Google OAuth', async () => {
        await seedSettings();
        // verified (fresh)
        const now = new Date();
        await IntegrationVerification.create({
            key: 'operational_email', provider: 'twilio-email',
            lastAttemptAt: now, lastResult: 'success', verifiedAt: now,
        });
        // expired (31 days old)
        await IntegrationVerification.create({
            key: 'admin_sms', provider: 'twilio-sms',
            lastAttemptAt: new Date(now.getTime() - 31 * 24 * 3600 * 1000),
            lastResult: 'success',
            verifiedAt: new Date(now.getTime() - 31 * 24 * 3600 * 1000),
        });
        Object.assign(config.google, { clientId: 'gid', clientSecret: 'gsecret' });
        await recordGoogleOauthSuccess();

        const readiness = await getGoLiveReadiness();
        expect(readiness.integrations.email).toBe('verified');
        expect(readiness.integrations.adminSmsRecipient).toBe('verification_expired');
        expect(readiness.integrations.smsTransport).toBe('verification_expired');
        expect(readiness.integrations.googleOauth).toBe('verified');
        expect(readiness.integrationVerifications?.google_oauth?.lastResult).toBe('success');

        // failed
        await IntegrationVerification.updateOne(
            { key: 'operational_email' },
            { $set: { lastResult: 'failed', failureCategory: 'provider_rejected' } },
        );
        const after = await getGoLiveReadiness();
        expect(after.integrations.email).toBe('failed');

        Object.assign(config.google, { clientId: '', clientSecret: '' });
        const noGoogle = await getGoLiveReadiness();
        expect(noGoogle.integrations.googleOauth).toBe('not_configured');
    });

    it('never reports verified from configuration presence alone', async () => {
        await seedSettings();
        const readiness = await getGoLiveReadiness();
        expect(readiness.integrations.email).toBe('configured_unverified');
        expect(readiness.integrations.smsTransport).toBe('configured_unverified');
        expect(readiness.integrations.adminSmsRecipient).toBe('configured_unverified');
    });
});
