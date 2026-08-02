// Bank-transfer production configuration: IBAN/SWIFT validation and
// normalization on settings save, admin-only authorization, and the customer
// notification content rules — an approved order's email carries the complete
// transfer instructions (incl. SWIFT and a proof-of-transfer request),
// pending/rejected notifications never contain bank details, and SMS never
// carries account values. All bank values here are synthetic test fixtures.

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
import Order from '../models/Order.js';
import { config } from '../config/index.js';
import { sendCustomerOrderNotification } from '../services/orderNotificationService.js';
import {
    ilIbanMismatch,
    ilIbanParts,
    isValidIban,
    isValidSwift,
    normalizeIban,
    normalizeSwift,
} from '../utils/bankDetails.js';

const app = buildTestApp();

// Structurally valid IL IBAN embedding bank 010 / branch 900 / account
// 12345678 — consistent with the fields below, never a real account.
const TEST_IBAN = 'IL530109000000012345678';

const VALID_BANK = {
    enabled: true,
    bankName: 'בנק בדיקה',
    branch: '900',
    accountNumber: '12345678',
    accountName: 'Crystolia Products Ltd',
    iban: TEST_IBAN,
    swift: 'TESTILITXXX',
    bankAddress: 'שדרות הבדיקה 38, גבעת שמואל',
};
const CARD_OFF = { enabled: false, paymentUrl: '' };

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

describe('bank-detail helpers', () => {
    it('normalizes IBAN and SWIFT to uppercase without whitespace', () => {
        expect(normalizeIban(' il53 0109 0000 0001 2345 678 ')).toBe(TEST_IBAN);
        expect(normalizeSwift(' testilit xxx ')).toBe('TESTILITXXX');
        expect(normalizeIban(undefined)).toBe('');
    });

    it('accepts a checksum-valid IBAN and rejects a corrupted one', () => {
        expect(isValidIban(TEST_IBAN)).toBe(true);
        expect(isValidIban('IL530109000000012345679')).toBe(false); // last digit altered
        expect(isValidIban('IL53')).toBe(false);
        expect(isValidIban('NOTANIBAN')).toBe(false);
    });

    it('validates SWIFT/BIC shapes', () => {
        expect(isValidSwift('TESTILIT')).toBe(true);
        expect(isValidSwift('TESTILITXXX')).toBe(true);
        expect(isValidSwift('TEST')).toBe(false);
        expect(isValidSwift('12345678')).toBe(false);
        expect(isValidSwift('TESTILITXX')).toBe(false); // 10 chars
    });

    it('extracts and cross-checks the components of an Israeli IBAN', () => {
        expect(ilIbanParts(TEST_IBAN)).toEqual({
            bankCode: '010',
            branch: '900',
            accountNumber: '0000012345678',
        });
        expect(ilIbanParts('DE89370400440532013000')).toBeNull();
        expect(ilIbanMismatch(TEST_IBAN, '900', '12345678')).toBeNull();
        expect(ilIbanMismatch(TEST_IBAN, '900', '12-345-678')).toBeNull(); // formatting ignored
        expect(ilIbanMismatch(TEST_IBAN, '123', '12345678')).toMatch(/branch/);
        expect(ilIbanMismatch(TEST_IBAN, '900', '999')).toMatch(/account/);
    });
});

describe('settings authorization', () => {
    it('never returns bank details without authentication', async () => {
        await Settings.create({
            key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [],
            paymentOptions: { bankTransfer: VALID_BANK, creditCard: CARD_OFF },
        });
        for (const path of ['/api/settings', '/api/v1/settings']) {
            const res = await request(app).get(path);
            expect(res.status, path).toBe(401);
            expect(JSON.stringify(res.body)).not.toContain(TEST_IBAN);
        }
    });

    it('rejects settings writes from non-admin users', async () => {
        const company = await Company.create({ name: 'לקוח הרשאות', vatNumber: '577001234' });
        const customer = await User.create({
            name: 'לקוח', email: 'authz-customer@example.com', password: 'Password1',
            role: 'customer', company: company._id, isActive: true, registrationStatus: 'approved',
        });
        const res = await request(app)
            .put('/api/v1/settings')
            .set('Cookie', authCookieFor(customer))
            .send({ paymentOptions: { bankTransfer: VALID_BANK, creditCard: CARD_OFF } });
        expect(res.status).toBe(403);
        expect(await Settings.countDocuments()).toBe(0);
    });
});

describe('settings save validation & normalization', () => {
    let adminCookie = '';
    beforeEach(async () => {
        adminCookie = authCookieFor(await createAdmin());
    });
    async function putSettings(bankTransfer: Record<string, unknown>) {
        return request(app)
            .put('/api/v1/settings')
            .set('Cookie', adminCookie)
            .send({ paymentOptions: { bankTransfer, creditCard: CARD_OFF } });
    }

    it('stores IBAN and SWIFT normalized (uppercase, no spaces)', async () => {
        const res = await putSettings({
            ...VALID_BANK,
            iban: ' il53 0109 0000 0001 2345 678 ',
            swift: 'testilit xxx',
        });
        expect(res.status).toBe(200);
        const bank = res.body.data.paymentOptions.bankTransfer;
        expect(bank.iban).toBe(TEST_IBAN);
        expect(bank.swift).toBe('TESTILITXXX');
        expect(bank.bankAddress).toBe(VALID_BANK.bankAddress);
    });

    it('requires an IBAN when bank transfer is enabled', async () => {
        const res = await putSettings({ ...VALID_BANK, iban: '' });
        expect(res.status).toBe(400);
        expect(res.body.error || res.body.message).toMatch(/IBAN/);
    });

    it('rejects an IBAN that fails the mod-97 checksum', async () => {
        const res = await putSettings({ ...VALID_BANK, iban: 'IL530109000000012345679' });
        expect(res.status).toBe(400);
        expect(res.body.error || res.body.message).toMatch(/IBAN is invalid/);
    });

    it('rejects an Israeli IBAN that disagrees with the branch or account fields', async () => {
        const branchMismatch = await putSettings({ ...VALID_BANK, branch: '123' });
        expect(branchMismatch.status).toBe(400);
        expect(branchMismatch.body.error || branchMismatch.body.message).toMatch(/does not match the branch/);

        const accountMismatch = await putSettings({ ...VALID_BANK, accountNumber: '99999' });
        expect(accountMismatch.status).toBe(400);
        expect(accountMismatch.body.error || accountMismatch.body.message).toMatch(/does not match the account/);
        expect(await Settings.countDocuments()).toBe(0);
    });

    it('rejects a malformed SWIFT/BIC', async () => {
        const res = await putSettings({ ...VALID_BANK, swift: 'NOT-A-BIC' });
        expect(res.status).toBe(400);
        expect(res.body.error || res.body.message).toMatch(/SWIFT/);
    });

    it('still saves a disabled bank-transfer method with empty details (backward compatible)', async () => {
        const res = await putSettings({ enabled: false });
        expect(res.status).toBe(200);
        expect(res.body.data.paymentOptions.bankTransfer.enabled).toBe(false);
    });
});

describe('customer notification content', () => {
    const originalEmail = { ...config.email };
    const originalSms = { ...config.sms };

    beforeEach(() => {
        Object.assign(config.email, {
            provider: 'twilio', apiKey: '', fromAddress: 'no-reply@test.crystolia.com', fromName: 'Crystolia',
        });
        Object.assign(config.sms, { accountSid: 'ACtest', authToken: 'token', fromNumber: '+15550001111', messagingServiceSid: '' });
    });
    afterEach(() => {
        Object.assign(config.email, originalEmail);
        Object.assign(config.sms, originalSms);
        vi.restoreAllMocks();
    });

    let counter = 0;
    async function bankOrder(status: 'approved' | 'pending' | 'rejected') {
        counter += 1;
        await Settings.findOneAndUpdate(
            { key: 'business' },
            {
                minimumOrderAmount: 0, currency: 'ILS', boxPrices: [],
                paymentOptions: { bankTransfer: VALID_BANK, creditCard: CARD_OFF },
            },
            { upsert: true },
        );
        const company = await Company.create({ name: `חברת תוכן ${counter}`, vatNumber: `58800000${counter}` });
        const customer = await User.create({
            name: 'לקוח תוכן', email: `content-${counter}@example.com`, phone: '0500000002',
            password: 'ContentPass1', role: 'customer', company: company._id,
            isActive: true, registrationStatus: 'approved', preferredLocale: 'he',
        });
        return Order.create({
            company: company._id,
            createdBy: customer._id,
            items: [{ productName: 'שמן חמניות 5L', quantity: 1, price: 100 }],
            totalAmount: 100,
            status,
            paymentPreference: 'bank_transfer',
            ...(status === 'rejected' ? { rejectionReason: 'חסר במלאי' } : {}),
        });
    }

    function sentPayloads(post: { mock: { calls: unknown[][] } }) {
        const calls = post.mock.calls as Array<[string, unknown]>;
        const email = calls.filter(([url]) => String(url).includes('comms.twilio.com'))
            .map(([, body]) => JSON.stringify(body)).join('\n');
        // URLSearchParams encodes spaces as '+': restore them before decoding.
        const sms = calls.filter(([url]) => String(url).includes('api.twilio.com'))
            .map(([, body]) => decodeURIComponent(String(body).replace(/\+/g, ' '))).join('\n');
        return { email, sms };
    }

    it('approved: email carries full instructions + reference + proof request; SMS carries none of it', async () => {
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: { sid: 'SM1' } });
        const order = await bankOrder('approved');
        const results = await sendCustomerOrderNotification(order, 'approved', ['email', 'sms']);
        expect(results.email?.success).toBe(true);
        expect(results.sms?.success).toBe(true);

        const { email, sms } = sentPayloads(post);
        const shortId = order._id.toString().slice(-8).toUpperCase();
        expect(email).toContain(`IBAN: ${TEST_IBAN}`);
        expect(email).toContain('SWIFT/BIC: TESTILITXXX');
        expect(email).toContain(VALID_BANK.bankName);
        expect(email).toContain(VALID_BANK.accountName);
        expect(email).toContain(VALID_BANK.bankAddress);
        expect(email).toContain(`#${shortId}`);
        expect(email).toContain('אסמכתא');

        expect(sms).toContain('העברה בנקאית');
        expect(sms).not.toContain(TEST_IBAN);
        expect(sms).not.toContain('TESTILITXXX');
        expect(sms).not.toContain('12345678');
    });

    it('pending and rejected: neither email nor SMS contains any bank detail', async () => {
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: { sid: 'SM2' } });
        for (const status of ['pending', 'rejected'] as const) {
            post.mockClear();
            const order = await bankOrder(status);
            await sendCustomerOrderNotification(order, status, ['email', 'sms']);
            const { email, sms } = sentPayloads(post);
            expect(email.length).toBeGreaterThan(0);
            for (const payload of [email, sms]) {
                expect(payload, status).not.toContain(TEST_IBAN);
                expect(payload, status).not.toContain('TESTILITXXX');
                expect(payload, status).not.toContain(VALID_BANK.accountNumber);
                expect(payload, status).not.toContain(VALID_BANK.bankName);
            }
        }
    });
});
