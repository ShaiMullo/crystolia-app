// Admin "retry customer notification" — the FULL safety matrix from the
// PR #80 review: per-channel selection (a sent channel is never resent),
// durable attempt records, exact-status/seq claims, stale-lease → unknown,
// explicit confirmation for unknown delivery, and honest outcomes.

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
    PAYMENT_OPTIONS_BANK_ENABLED,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import NotificationAttempt from '../models/NotificationAttempt.js';
import { config } from '../config/index.js';
import { retryOrderNotification, reconcileNotificationLease } from '../services/orderNotificationRetryService.js';

const app = buildTestApp();

const originalEmail = { ...config.email };
const originalSms = { ...config.sms };

beforeAll(async () => {
    // Replica set: the claim and finalization phases run in REQUIRED
    // transactions (runRequiredTransaction has no fallback).
    await startTestDb({ replSet: true });
    await NotificationAttempt.init();
});
afterAll(async () => {
    await stopTestDb();
});
afterEach(() => {
    Object.assign(config.email, originalEmail);
    Object.assign(config.sms, originalSms);
    vi.restoreAllMocks();
});

/** Make BOTH providers "configured" and every provider HTTP call succeed. */
function mockProvidersUp() {
    config.email.apiKey = 'SG.test-key';
    config.email.fromAddress = 'no-reply@test.crystolia.com';
    config.sms.accountSid = 'ACtest';
    config.sms.authToken = 'token';
    config.sms.fromNumber = '+15550001111';
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: { sid: 'SM-RETRY-1' } });
}

let counter = 0;
async function orderWithNotification(meta: Record<string, unknown> | null, overrides: Record<string, unknown> = {}) {
    counter += 1;
    const company = await Company.create({ name: `חברת ריטריי ${counter}`, vatNumber: `51100000${counter}` });
    const customer = await User.create({
        name: 'לקוח ריטריי',
        email: `retry-${counter}@example.com`,
        phone: overrides.noPhone ? undefined : '0500000001',
        password: 'RetryPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    const timeline: Array<Record<string, unknown>> = [{ type: 'order_created', at: new Date() }];
    if (meta) timeline.push({ type: 'customer_order_notification', at: new Date(), meta });
    const order = await Order.create({
        company: company._id,
        createdBy: customer._id,
        items: [{ productName: 'שמן', quantity: 1, price: 50 }],
        totalAmount: 50,
        status: 'approved',
        paymentPreference: 'bank_transfer',
        inventoryReserved: true,
        timeline,
        ...(overrides.order as Record<string, unknown> ?? {}),
    });
    return { order, customer };
}

const retryReq = (id: unknown, cookie: string, body: Record<string, unknown> = {}) =>
    request(app).post(`/api/v1/orders/${id}/notifications/retry`).set('Cookie', cookie).send(body);

beforeEach(async () => {
    await clearDb();
    await NotificationAttempt.init();
    await Settings.create({
        key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
});

describe('per-channel selection', () => {
    it('email sent + SMS failed → ONLY the SMS channel is attempted', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'sent', sms: 'failed' });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.attempted).toEqual(['sms']);
        expect(res.body.data.results.email).toBeUndefined();

        // The durable attempt record proves what was actually sent.
        const attempt = await NotificationAttempt.findOne({ order: order._id }).lean();
        expect(attempt?.channels).toEqual(['sms']);
        // The retry timeline entry covers ONLY the attempted channel.
        const stored = await Order.findById(order._id).lean();
        const retryEvent = stored?.timeline.find((e: { meta?: { retry?: boolean } }) => e.meta?.retry === true);
        expect((retryEvent?.meta as { email?: string }).email).toBeUndefined();
        expect((retryEvent?.meta as { sms?: string }).sms).toBeTruthy();
    });

    it('SMS sent + email failed → ONLY the email channel is attempted', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'sent' });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.attempted).toEqual(['email']);
        expect((await NotificationAttempt.findOne({ order: order._id }).lean())?.channels).toEqual(['email']);
    });

    it('a permanently missing phone never causes email duplication', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification(
            { status: 'approved', email: 'sent', sms: 'failed' },
            { noPhone: true },
        );

        // First retry: SMS only, and it cannot deliver (no phone).
        const first = await retryReq(order._id, authCookieFor(admin));
        expect(first.status).toBe(200);
        expect(first.body.data.attempted).toEqual(['sms']);
        expect(first.body.data.outcome).toBe('failed');

        // Second retry: STILL only SMS — the sent email is never re-attempted.
        const second = await retryReq(order._id, authCookieFor(admin));
        expect(second.status).toBe(200);
        expect(second.body.data.attempted).toEqual(['sms']);
        const attempts = await NotificationAttempt.find({ order: order._id }).lean();
        expect(attempts.every((a) => a.channels.length === 1 && a.channels[0] === 'sms')).toBe(true);
    });
});

describe('claims, concurrency and staleness', () => {
    it('two concurrent retries → exactly one attempt', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        const [r1, r2] = await Promise.all([
            retryReq(order._id, cookie),
            retryReq(order._id, cookie),
        ]);
        const statuses = [r1.status, r2.status].sort();
        expect(statuses[0]).toBe(200);
        expect([409, 429]).toContain(statuses[1]);
        expect(await NotificationAttempt.countDocuments({ order: order._id })).toBe(1);
    });

    it('a status change between eligibility read and claim invalidates the claim', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        // Read the doc (eligibility snapshot), then the status changes.
        const stale = await Order.findById(order._id);
        await Order.updateOne({ _id: order._id }, { $set: { status: 'shipped' } });

        const result = await retryOrderNotification(stale!, { actorId: String(admin._id) });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.refusal.code).toBe('STATE_CHANGED');
        expect(await NotificationAttempt.countDocuments({ order: order._id })).toBe(0);
    });

    it('a completed retry in between invalidates the next claim (seq guard)', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        const stale = await Order.findById(order._id); // seq snapshot: null
        expect((await retryReq(order._id, cookie)).status).toBe(200); // bumps notificationSeq

        const result = await retryOrderNotification(stale!, { actorId: String(admin._id) });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.refusal.code).toBe('STATE_CHANGED');
    });

    it('a stale in-progress attempt resolves to `unknown` and requires explicit confirmation', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        // Simulate a crash: an old in-progress attempt holding the lease.
        const staleId = 'stale-attempt-0001';
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: staleId,
            channels: ['email', 'sms'], status: 'in_progress',
            startedAt: new Date(Date.now() - 11 * 60 * 1000),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: staleId } });

        // Without confirmation: refused, and the stale attempt is now `unknown`.
        const refused = await retryReq(order._id, cookie);
        expect(refused.status).toBe(409);
        expect(refused.body.error).toBe('UNKNOWN_DELIVERY_CONFIRM_REQUIRED');
        expect((await NotificationAttempt.findOne({ attemptId: staleId }).lean())?.status).toBe('unknown');

        // With explicit confirmation: proceeds.
        const confirmed = await retryReq(order._id, cookie, { confirmUnknown: true });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.data.attempted.sort()).toEqual(['email', 'sms']);
    });

    it('a fresh in-progress attempt blocks with 429 and is NOT auto-resolved', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'live-attempt-1',
            channels: ['email'], status: 'in_progress', startedAt: new Date(),
        });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(429);
        expect((await NotificationAttempt.findOne({ attemptId: 'live-attempt-1' }).lean())?.status).toBe('in_progress');
    });
});

describe('honest outcomes', () => {
    it('all channels fail → outcome "failed"', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.outcome).toBe('failed'); // nothing was delivered
    });

    it('partial success → outcome "partial"', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        // Email up (Twilio Email shares the account credentials) while SMS
        // stays unconfigured (no sender number/service) → email sends,
        // SMS is skipped → partial.
        config.sms.accountSid = 'ACtest';
        config.sms.authToken = 'token';
        config.email.fromAddress = 'no-reply@test.crystolia.com';
        vi.spyOn(axios, 'post').mockResolvedValue({ status: 202, data: {} });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.results.email).toBe('sent');
        expect(res.body.data.results.sms).toBe('skipped');
        expect(res.body.data.outcome).toBe('partial');
    });

    it('full success → outcome "success", and a further retry finds nothing to do', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        mockProvidersUp();

        const res = await retryReq(order._id, cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.outcome).toBe('success');
        expect(res.body.data.results).toEqual({ email: 'sent', sms: 'sent' });

        // Both channels now `sent` — a repeat retry must refuse, not resend.
        const repeat = await retryReq(order._id, cookie);
        expect(repeat.status).toBe(409);
        expect(repeat.body.error).toBe('NOTHING_TO_RETRY');
        expect(await NotificationAttempt.countDocuments({ order: order._id })).toBe(1);
    });

    it('audit log records categories/outcomes only — never recipient details', async () => {
        const admin = await createAdmin();
        const { order, customer } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        expect((await retryReq(order._id, authCookieFor(admin))).status).toBe(200);

        const audit = await AuditLog.findOne({ action: 'NOTIFICATION_RETRY', entityId: order._id.toString() }).lean();
        expect(audit).toBeTruthy();
        const raw = JSON.stringify(audit?.details ?? {});
        expect(raw).not.toContain(customer.email);
        expect(raw).not.toContain('0500000001');
        // The attempt record is equally clean.
        const attempt = await NotificationAttempt.findOne({ order: order._id }).lean();
        const attemptRaw = JSON.stringify(attempt ?? {});
        expect(attemptRaw).not.toContain(customer.email);
        expect(attemptRaw).not.toContain('0500000001');
    });
});

describe('transactional phases (failpoints)', () => {
    it('failure between order claim and attempt creation leaves neither lease nor attempt', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });

        vi.spyOn(NotificationAttempt, 'create').mockRejectedValueOnce(new Error('injected create failure'));
        const doc = await Order.findById(order._id);
        await expect(retryOrderNotification(doc!, { actorId: String(admin._id) })).rejects.toThrow('injected create failure');

        // The claim transaction aborted: no orphan lease, no partial attempt.
        const stored = await Order.findById(order._id).lean();
        expect(stored?.activeNotificationAttempt ?? null).toBeNull();
        expect(await NotificationAttempt.countDocuments({ order: order._id })).toBe(0);

        // And the next retry proceeds normally.
        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
    });

    it('finalization guard mismatch cannot create split state', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        mockProvidersUp();
        vi.mocked(axios.post).mockImplementation(async () => {
            // Mid-send: another process "steals" the lease (e.g. a stale-TTL
            // takeover) — OUR finalization must then refuse to record.
            await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'stolen-lease' } });
            return { status: 202, data: { sid: 'SM-X' } };
        });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('FINALIZATION_CONFLICT');

        // No split state: the attempt is NOT completed (it is `unknown`),
        // the order got no timeline entry and no seq bump from us.
        const attempt = await NotificationAttempt.findOne({ order: order._id }).lean();
        expect(attempt?.status).toBe('unknown');
        const stored = await Order.findById(order._id).lean();
        expect(stored?.activeNotificationAttempt).toBe('stolen-lease'); // untouched
        expect(stored?.notificationSeq ?? null).toBeNull();
        expect(stored?.timeline.some((e: { meta?: { retry?: boolean } }) => e.meta?.retry === true)).toBe(false);
    });
});

describe('mutual exclusion with status transitions', () => {
    it('a live status-transition lock blocks the retry claim', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await Order.updateOne({ _id: order._id }, { $set: { statusLockAt: new Date() } });

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('STATE_CHANGED');
        expect(await NotificationAttempt.countDocuments({ order: order._id })).toBe(0);
    });

    it('a live notification lease blocks status transitions', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'live-blocker',
            channels: ['email'], status: 'in_progress', startedAt: new Date(),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'live-blocker' } });

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'shipped' });
        expect(res.status).toBe(409);
        expect((await Order.findById(order._id).lean())?.status).toBe('approved');
    });

    it('a real retry-vs-transition race: exactly one wins, no locks remain, no obsolete notification', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        mockProvidersUp();
        vi.mocked(axios.post).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ status: 202, data: { sid: 'SM-R' } }), 150)),
        );

        // supertest is lazy — .then() forces the request to DISPATCH now,
        // so the retry genuinely holds its lease before the transition fires.
        const retryPromise = retryReq(order._id, cookie).then((r) => r);
        await new Promise((resolve) => setTimeout(resolve, 40)); // retry holds its lease mid-send
        const transitionPromise = request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'shipped' });

        const [retryRes, transitionRes] = await Promise.all([retryPromise, transitionPromise]);
        expect(retryRes.status).toBe(200);
        expect(transitionRes.status).toBe(409); // transition lost the race

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('approved');                       // no transition happened
        expect(stored?.activeNotificationAttempt ?? null).toBeNull();  // no lock remains
        expect(stored?.statusLockAt ?? null).toBeNull();
        // The notification recorded is for the status it was claimed under —
        // never an obsolete one.
        const retryEvent = stored?.timeline.find((e: { meta?: { retry?: boolean } }) => e.meta?.retry === true);
        expect((retryEvent?.meta as { status?: string }).status).toBe('approved');

        // With the lease released, the transition now proceeds cleanly.
        const after = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'shipped' });
        expect(after.status).toBe(200);
    });
});

describe('lease reconciliation (recovery invariant)', () => {
    const shipReq = (id: unknown, cookie: string) =>
        request(app).patch(`/api/orders/${id}`).set('Cookie', cookie).send({ status: 'shipped' });

    it('finalization conflict while the lease is still OURS releases it — no permanent lock', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        mockProvidersUp();

        // Failpoint: the finalization's ORDER write reports no match while
        // the lease is genuinely still ours.
        const original = Order.findOneAndUpdate.bind(Order);
        vi.spyOn(Order, 'findOneAndUpdate').mockImplementation(((filter: unknown, update: { $inc?: { notificationSeq?: number } }, opts: unknown) => {
            if (update?.$inc?.notificationSeq) return Promise.resolve(null);
            return original(filter as never, update as never, opts as never);
        }) as never);

        const res = await retryReq(order._id, cookie);
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('FINALIZATION_CONFLICT');

        vi.restoreAllMocks();
        const stored = await Order.findById(order._id).lean();
        expect(stored?.activeNotificationAttempt ?? null).toBeNull(); // OUR lease released
        expect((await NotificationAttempt.findOne({ order: order._id }).lean())?.status).toBe('unknown');

        // The order is fully workable again: a normal transition proceeds.
        expect((await shipReq(order._id, cookie)).status).toBe(200);
    });

    it('crash between "mark unknown" and "release lease" is repaired by reconciliation', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'crashed-after-unknown',
            channels: ['email'], status: 'unknown', startedAt: new Date(), finishedAt: new Date(),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'crashed-after-unknown' } });

        // A normal status transition self-heals via reconciliation and wins.
        expect((await shipReq(order._id, cookie)).status).toBe(200);
        expect((await Order.findById(order._id).lean())?.activeNotificationAttempt ?? null).toBeNull();
    });

    it('an orphan lease with NO attempt document is repaired', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'ghost-attempt' } });

        expect((await shipReq(order._id, cookie)).status).toBe(200);
        expect((await Order.findById(order._id).lean())?.activeNotificationAttempt ?? null).toBeNull();
    });

    it('a lease pointing at a COMPLETED attempt is repaired', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'completed-but-leased',
            channels: ['email'], status: 'completed', startedAt: new Date(), finishedAt: new Date(),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'completed-but-leased' } });

        expect((await shipReq(order._id, cookie)).status).toBe(200);
        expect((await Order.findById(order._id).lean())?.activeNotificationAttempt ?? null).toBeNull();
    });

    it('a FRESH live attempt keeps its lease through reconciliation', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'fresh-live',
            channels: ['email'], status: 'in_progress', startedAt: new Date(),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'fresh-live' } });

        await reconcileNotificationLease(order._id);
        expect((await Order.findById(order._id).lean())?.activeNotificationAttempt).toBe('fresh-live');
        expect((await shipReq(order._id, cookie)).status).toBe(409); // still excluded, correctly
    });

    it('a stolen/newer lease is never cleared — every clear is guarded by the exact value it targets', async () => {
        const { order } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        // NOTE: "stale in_progress attempt exists WHILE a newer fresh lease
        // is live" is unrepresentable by design (the unique partial index
        // allows one in_progress attempt per order), so the protection is
        // the GUARDED WRITE itself. Prove it directly: the DB holds lease B
        // (fresh live work); a clear issued for a previously-read value A —
        // exactly what reconciliation/finalization would issue after losing
        // a race — must be a no-op.
        await NotificationAttempt.create({
            order: order._id, forStatus: 'approved', attemptId: 'newer-live-B',
            channels: ['sms'], status: 'in_progress', startedAt: new Date(),
        });
        await Order.updateOne({ _id: order._id }, { $set: { activeNotificationAttempt: 'newer-live-B' } });

        const clear = await Order.updateOne(
            { _id: order._id, activeNotificationAttempt: 'older-read-A' },
            { $unset: { activeNotificationAttempt: 1 } },
        );
        expect(clear.modifiedCount).toBe(0);

        // And full reconciliation also leaves the fresh lease intact.
        await reconcileNotificationLease(order._id);
        expect((await Order.findById(order._id).lean())?.activeNotificationAttempt).toBe('newer-live-B');
    });
});

describe('channel independence', () => {
    it('no email + valid phone → SMS is still sent', async () => {
        const admin = await createAdmin();
        const { order, customer } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        await User.collection.updateOne({ _id: customer._id }, { $unset: { email: 1 } });
        mockProvidersUp();

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.results.sms).toBe('sent');
        expect(res.body.data.results.email).toBe('skipped'); // recipient missing ≠ SMS blocked
        expect(res.body.data.outcome).toBe('partial');
    });

    it('valid email + no phone → email is still sent', async () => {
        const admin = await createAdmin();
        const { order } = await orderWithNotification(
            { status: 'approved', email: 'failed', sms: 'failed' },
            { noPhone: true },
        );
        mockProvidersUp();

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.results.email).toBe('sent');
        expect(res.body.data.results.sms).toBe('skipped');
        expect(res.body.data.outcome).toBe('partial');
    });

    it('neither contact method → honest per-channel skipped results', async () => {
        const admin = await createAdmin();
        const { order, customer } = await orderWithNotification(
            { status: 'approved', email: 'failed', sms: 'failed' },
            { noPhone: true },
        );
        await User.collection.updateOne({ _id: customer._id }, { $unset: { email: 1 } });
        mockProvidersUp();

        const res = await retryReq(order._id, authCookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.results.email).toBe('skipped');
        expect(res.body.data.results.sms).toBe('skipped');
        expect(res.body.data.outcome).toBe('failed'); // nothing delivered
    });
});

describe('eligibility guards', () => {
    it('refuses when everything already sent / nothing recorded', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const sentOrder = await orderWithNotification({ status: 'approved', email: 'sent', sms: 'sent' });
        expect((await retryReq(sentOrder.order._id, cookie)).status).toBe(409);

        const noneOrder = await orderWithNotification(null);
        const res = await retryReq(noneOrder.order._id, cookie);
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('NOTHING_TO_RETRY');
    });

    it('is admin-only', async () => {
        const { order, customer } = await orderWithNotification({ status: 'approved', email: 'failed', sms: 'failed' });
        expect((await retryReq(order._id, authCookieFor(customer))).status).toBe(403);
    });
});
