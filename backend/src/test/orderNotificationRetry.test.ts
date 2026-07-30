// Admin "retry customer notification": only after a recorded failure,
// double-submit protected, audited, and side-effect free otherwise.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
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

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});

let counter = 0;
async function approvedOrderWith(notificationMeta: Record<string, unknown> | null) {
    counter += 1;
    const company = await Company.create({ name: `חברת ריטריי ${counter}`, vatNumber: `51100000${counter}` });
    const customer = await User.create({
        name: 'לקוח ריטריי',
        email: `retry-${counter}@example.com`,
        password: 'RetryPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    const timeline: Array<Record<string, unknown>> = [{ type: 'order_created', at: new Date() }];
    if (notificationMeta) {
        timeline.push({ type: 'customer_order_notification', at: new Date(), meta: notificationMeta });
    }
    return Order.create({
        company: company._id,
        createdBy: customer._id,
        items: [{ productName: 'שמן', quantity: 1, price: 50 }],
        totalAmount: 50,
        status: 'approved',
        paymentPreference: 'bank_transfer',
        inventoryReserved: true,
        timeline,
    });
}

beforeEach(async () => {
    await clearDb();
    await Settings.create({
        key: 'business',
        minimumOrderAmount: 0,
        currency: 'ILS',
        boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
});

describe('POST /api/v1/orders/:id/notifications/retry', () => {
    it('retries after a recorded failure: timeline entry + audit log', async () => {
        const admin = await createAdmin();
        const order = await approvedOrderWith({ status: 'approved', email: 'failed', sms: 'failed' });

        const res = await request(app)
            .post(`/api/v1/orders/${order._id}/notifications/retry`)
            .set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(200);
        // Providers are unconfigured in tests → the retry itself records
        // another failure, which is exactly what must be visible.
        expect(res.body.data.email).toBe('failed');

        const stored = await Order.findById(order._id).lean();
        const retryEvents = stored?.timeline.filter(
            (e: { type: string; meta?: { retry?: boolean } }) => e.type === 'customer_order_notification' && e.meta?.retry === true,
        );
        expect(retryEvents).toHaveLength(1);

        const audit = await AuditLog.findOne({ action: 'NOTIFICATION_RETRY', entityId: order._id.toString() }).lean();
        expect(audit).toBeTruthy();
    });

    it('is double-submit protected: an immediate second retry returns 429', async () => {
        const admin = await createAdmin();
        const order = await approvedOrderWith({ status: 'approved', email: 'failed', sms: 'sent' });
        const cookie = authCookieFor(admin);

        expect((await request(app).post(`/api/v1/orders/${order._id}/notifications/retry`).set('Cookie', cookie)).status).toBe(200);
        const second = await request(app).post(`/api/v1/orders/${order._id}/notifications/retry`).set('Cookie', cookie);
        expect(second.status).toBe(429);

        const stored = await Order.findById(order._id).lean();
        const retryEvents = stored?.timeline.filter(
            (e: { type: string; meta?: { retry?: boolean } }) => e.type === 'customer_order_notification' && e.meta?.retry === true,
        );
        expect(retryEvents).toHaveLength(1); // exactly one send happened
    });

    it('refuses when the last notification for the current status succeeded', async () => {
        const admin = await createAdmin();
        const order = await approvedOrderWith({ status: 'approved', email: 'sent', sms: 'sent' });
        const res = await request(app)
            .post(`/api/v1/orders/${order._id}/notifications/retry`)
            .set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(409);
    });

    it('refuses when there was no notification attempt at all', async () => {
        const admin = await createAdmin();
        const order = await approvedOrderWith(null);
        const res = await request(app)
            .post(`/api/v1/orders/${order._id}/notifications/retry`)
            .set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(409);
    });

    it('is admin-only', async () => {
        const order = await approvedOrderWith({ status: 'approved', email: 'failed', sms: 'failed' });
        const customer = await User.findOne({ email: `retry-${counter}@example.com` });
        const res = await request(app)
            .post(`/api/v1/orders/${order._id}/notifications/retry`)
            .set('Cookie', authCookieFor(customer!));
        expect(res.status).toBe(403);
    });
});
