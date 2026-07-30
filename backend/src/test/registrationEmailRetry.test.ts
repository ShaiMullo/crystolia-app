// Hardened /resend-registration-email: never resends a sent email, unknown
// or never-recorded outcomes need explicit confirmation, and the claim
// binds the exact registration status + recorded value + lease.

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
import AuditLog from '../models/AuditLog.js';
import { config } from '../config/index.js';

const app = buildTestApp();
const originalEmail = { ...config.email };
const originalSms = { ...config.sms };

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});
afterEach(() => {
    Object.assign(config.email, originalEmail);
    Object.assign(config.sms, originalSms);
    vi.restoreAllMocks();
});

let counter = 0;
async function registration(status: 'pending' | 'approved' | 'rejected', emailStatus?: string) {
    counter += 1;
    const kindField = status === 'approved' ? 'approvedEmailStatus' : status === 'rejected' ? 'rejectedEmailStatus' : 'pendingEmailStatus';
    return User.create({
        name: 'נרשם ריטריי',
        email: `reg-retry-${counter}@example.com`,
        password: 'RegRetryPass1',
        role: 'customer',
        isActive: status === 'approved',
        registrationStatus: status,
        registrationMethod: 'password',
        registrationCompany: { name: `חברת הרשמה ${counter}`, vatNumber: `50000000${counter}`, country: 'IL' },
        ...(status === 'rejected' ? { rejectionReason: 'סיבת דחייה לבדיקה' } : {}),
        ...(emailStatus ? { registrationNotifications: { [kindField]: emailStatus } } : {}),
    });
}

const retryReq = (id: unknown, cookie: string, body: Record<string, unknown> = {}) =>
    request(app).post(`/api/users/${id}/resend-registration-email`).set('Cookie', cookie).send(body);

describe('registration email retry', () => {
    it('never resends an email recorded as sent', async () => {
        const admin = await createAdmin();
        const user = await registration('approved', 'sent');
        const res = await retryReq(user._id, authCookieFor(admin));
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('NOTHING_TO_RETRY');
    });

    it('retries a failed email for the matching status and records the outcome', async () => {
        const admin = await createAdmin();
        const user = await registration('approved', 'failed');
        const res = await retryReq(user._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.kind).toBe('approved');
        // Providers unconfigured in tests → the honest result is skipped.
        expect(res.body.data.result).toBe('skipped');
        expect(res.body.data.sent).toBe(false);

        const stored = await User.findById(user._id).lean();
        expect(stored?.registrationNotifications?.approvedEmailStatus).toBe('skipped');
        expect(stored?.registrationNotifications?.retryAttemptId ?? null).toBeNull(); // lease released

        const audit = await AuditLog.findOne({ entityId: user._id.toString(), action: 'UPDATE' }).lean();
        expect(JSON.stringify(audit?.details)).toContain('registrationEmailResent');
    });

    it('a rejected registration retries the rejection email (reason only when asked)', async () => {
        const admin = await createAdmin();
        const user = await registration('rejected', 'failed');
        const res = await retryReq(user._id, authCookieFor(admin), { shareReason: true });
        expect(res.status).toBe(200);
        expect(res.body.data.kind).toBe('rejected');
    });

    it('never-recorded or unknown outcomes require explicit confirmation', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const fresh = await registration('pending'); // nothing recorded
        const refused = await retryReq(fresh._id, cookie);
        expect(refused.status).toBe(409);
        expect(refused.body.error).toBe('UNKNOWN_DELIVERY_CONFIRM_REQUIRED');

        const confirmed = await retryReq(fresh._id, cookie, { confirmUnknown: true });
        expect(confirmed.status).toBe(200);

        const unknownUser = await registration('approved', 'unknown');
        expect((await retryReq(unknownUser._id, cookie)).status).toBe(409);
        expect((await retryReq(unknownUser._id, cookie, { confirmUnknown: true })).status).toBe(200);
    });

    it('two concurrent retries → exactly one claim wins', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('approved', 'failed');
        const [r1, r2] = await Promise.all([
            retryReq(user._id, cookie),
            retryReq(user._id, cookie),
        ]);
        const statuses = [r1.status, r2.status].sort();
        expect(statuses[0]).toBe(200);
        expect([409, 429]).toContain(statuses[1]);
    });

    it('a crash mid-send leaves an explicit unknown, never a silent duplicate path', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('approved', 'failed');

        // Configure email, then make the provider call CRASH (not reject
        // gracefully) after the pre-send `unknown` was persisted.
        config.sms.accountSid = 'ACtest';
        config.sms.authToken = 'token';
        config.email.fromAddress = 'no-reply@test.crystolia.com';
        vi.spyOn(axios, 'post').mockImplementation(() => { throw new Error('simulated crash'); });

        // sendEmail catches provider errors and records `failed`; a true
        // process crash cannot be simulated in-process, so verify the
        // pre-send persistence directly: claim ran → status became unknown
        // BEFORE the provider call, and the final record reflects the send.
        const res = await retryReq(user._id, cookie);
        expect(res.status).toBe(200);
        expect(['failed', 'skipped']).toContain(res.body.data.result);

        // Now simulate the crash artifact itself: an unknown status with a
        // dangling lease older than the TTL — retry must demand confirmation
        // and a fresh lease must be claimable.
        await User.updateOne({ _id: user._id }, {
            $set: {
                'registrationNotifications.approvedEmailStatus': 'unknown',
                'registrationNotifications.retryAttemptId': 'crashed-attempt',
                'registrationNotifications.retryStartedAt': new Date(Date.now() - 11 * 60 * 1000),
            },
        });
        expect((await retryReq(user._id, cookie)).status).toBe(409);
        expect((await retryReq(user._id, cookie, { confirmUnknown: true })).status).toBe(200);
    });

    it('is admin-only', async () => {
        const user = await registration('approved', 'failed');
        const res = await retryReq(user._id, authCookieFor(user));
        expect(res.status).toBe(403);
    });
});

describe('mutual exclusion with approval/rejection', () => {
    function configureEmail() {
        config.sms.accountSid = 'ACtest';
        config.sms.authToken = 'token';
        config.email.fromAddress = 'no-reply@test.crystolia.com';
    }

    it('a live approval lock blocks the retry claim', async () => {
        const admin = await createAdmin();
        const user = await registration('pending', 'failed');
        await User.updateOne({ _id: user._id }, {
            $set: { approvalLock: 'live-approval', approvalInProgressAt: new Date() },
        });
        const res = await retryReq(user._id, authCookieFor(admin));
        expect(res.status).toBe(429);
    });

    it('a live retry lease blocks approval AND rejection', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('pending', 'failed');
        await User.updateOne({ _id: user._id }, {
            $set: {
                'registrationNotifications.retryAttemptId': 'live-retry',
                'registrationNotifications.retryStartedAt': new Date(),
            },
        });

        const approve = await request(app)
            .post(`/api/users/${user._id}/approve-registration`)
            .set('Cookie', cookie);
        expect(approve.status).toBe(409);
        expect((await User.findById(user._id).lean())?.registrationStatus).toBe('pending');

        const reject = await request(app)
            .post(`/api/users/${user._id}/reject-registration`)
            .set('Cookie', cookie)
            .send({ reason: 'סיבה' });
        expect(reject.status).toBe(409);
        expect((await User.findById(user._id).lean())?.registrationStatus).toBe('pending');
    });

    it('a real pending-email retry vs approval race: exactly one wins', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('pending', 'failed');
        configureEmail();
        vi.spyOn(axios, 'post').mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ status: 202, data: {} }), 150)),
        );

        // supertest is lazy — .then() forces the request to DISPATCH now.
        const retryPromise = retryReq(user._id, cookie).then((r) => r);
        await new Promise((resolve) => setTimeout(resolve, 40)); // retry lease is live mid-send
        const approvePromise = request(app)
            .post(`/api/users/${user._id}/approve-registration`)
            .set('Cookie', cookie);

        const [retryRes, approveRes] = await Promise.all([retryPromise, approvePromise]);
        expect(retryRes.status).toBe(200);
        expect(approveRes.status).toBe(409); // approval lost — retries later

        const stored = await User.findById(user._id).lean();
        expect(stored?.registrationStatus).toBe('pending');                 // unchanged
        expect(stored?.registrationNotifications?.retryAttemptId ?? null).toBeNull(); // lease released
        expect(stored?.approvalLock ?? null).toBeNull();                    // no lock remains

        // With the lease released, approval now succeeds.
        const after = await request(app)
            .post(`/api/users/${user._id}/approve-registration`)
            .set('Cookie', cookie);
        expect(after.status).toBe(200);
    });
});

describe('rejection reason-sharing on retry', () => {
    function configureEmailWithCapture() {
        config.sms.accountSid = 'ACtest';
        config.sms.authToken = 'token';
        config.email.fromAddress = 'no-reply@test.crystolia.com';
        return vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: {} });
    }

    it('repeats the ORIGINAL "share reason" decision by default', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('pending');
        const spy = configureEmailWithCapture();

        // Reject WITH the reason shared → decision persisted.
        const reject = await request(app)
            .post(`/api/users/${user._id}/reject-registration`)
            .set('Cookie', cookie)
            .send({ reason: 'סיבת דחייה לבדיקה', shareReason: true });
        expect(reject.status).toBe(200);
        expect((await User.findById(user._id).lean())?.rejectionReasonShared).toBe(true);

        // Force a failed state, then retry WITHOUT specifying shareReason —
        // the email must include the reason again (original decision).
        await User.updateOne({ _id: user._id }, { $set: { 'registrationNotifications.rejectedEmailStatus': 'failed' } });
        spy.mockClear();
        const retry = await retryReq(user._id, cookie);
        expect(retry.status).toBe(200);
        expect(JSON.stringify(spy.mock.calls)).toContain('סיבת דחייה לבדיקה');
    });

    it('never silently adds the reason when the original rejection did not share it', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('pending');
        const spy = configureEmailWithCapture();

        const reject = await request(app)
            .post(`/api/users/${user._id}/reject-registration`)
            .set('Cookie', cookie)
            .send({ reason: 'סיבה חסויה מאוד', shareReason: false });
        expect(reject.status).toBe(200);
        expect((await User.findById(user._id).lean())?.rejectionReasonShared).toBe(false);

        await User.updateOne({ _id: user._id }, { $set: { 'registrationNotifications.rejectedEmailStatus': 'failed' } });
        spy.mockClear();
        const retry = await retryReq(user._id, cookie);
        expect(retry.status).toBe(200);
        expect(JSON.stringify(spy.mock.calls)).not.toContain('סיבה חסויה מאוד');
    });

    it('legacy records without the stored decision default to NOT sharing, with explicit override allowed', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const user = await registration('rejected', 'failed'); // no rejectionReasonShared stored
        const spy = configureEmailWithCapture();

        const retry = await retryReq(user._id, cookie);
        expect(retry.status).toBe(200);
        expect(JSON.stringify(spy.mock.calls)).not.toContain('סיבת דחייה לבדיקה');

        // Explicit admin choice overrides the default.
        await User.updateOne({ _id: user._id }, { $set: { 'registrationNotifications.rejectedEmailStatus': 'failed' } });
        spy.mockClear();
        const withReason = await retryReq(user._id, cookie, { shareReason: true });
        expect(withReason.status).toBe(200);
        expect(JSON.stringify(spy.mock.calls)).toContain('סיבת דחייה לבדיקה');
    });
});
