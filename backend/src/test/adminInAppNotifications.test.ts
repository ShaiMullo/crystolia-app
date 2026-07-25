// Persistent admin inbox: a new pending order and a new registration each
// create exactly ONE in-app notification per active admin (idempotent on
// retry), with deep links into the admin console; the notification routes
// stay admin/agent-only.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    createAdmin,
    authCookieFor,
    VALID_REGISTRATION,
    PAYMENT_OPTIONS_BANK_ENABLED,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import { notifyAdminOfNewOrder } from '../services/orderNotificationService.js';
import { notifyAdminOfRegistration } from '../services/registrationNotificationService.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
    await Settings.create({
        key: 'business',
        minimumOrderAmount: 0,
        currency: 'ILS',
        boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
    await Product.create({ name: 'שמן קנולה 5L', sku: 'NOTIF-5L', price: 80, taxRate: 0, stockTrackingEnabled: false });
});

async function approvedCustomer(suffix: string) {
    const company = await Company.create({ name: `לקוח התראות ${suffix}`, vatNumber: `58800000${suffix.length}` });
    const customer = await User.create({
        name: 'לקוח התראות',
        email: `notif-${suffix}@example.com`,
        password: 'NotifPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return { customer, cookie: authCookieFor(customer) };
}

describe('admin in-app notifications', () => {
    it('creates one order_pending_approval notification per admin for a new order', async () => {
        const admin = await createAdmin();
        const secondAdmin = await createAdmin({ email: 'admin2@test.crystolia.com' });
        const { cookie } = await approvedCustomer('a');

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'NOTIF-5L', quantity: 1 }], paymentPreference: 'bank_transfer' });
        expect(res.status).toBe(201);

        const notifications = await Notification.find({ type: 'order_pending_approval' }).lean();
        expect(notifications).toHaveLength(2);
        expect(new Set(notifications.map((n) => String(n.recipient))))
            .toEqual(new Set([String(admin._id), String(secondAdmin._id)]));
        for (const n of notifications) {
            expect(n.link).toBe(`/admin/orders/${res.body.data._id}`);
            expect(n.isRead).toBe(false);
            expect(n.meta).toMatchObject({ entityId: res.body.data._id });
        }
    });

    it('does not duplicate the order notification on retry', async () => {
        await createAdmin();
        const { customer, cookie } = await approvedCustomer('b');
        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'NOTIF-5L', quantity: 1 }], paymentPreference: 'bank_transfer' });
        expect(res.status).toBe(201);
        expect(customer.isActive).toBe(true);

        // Simulate a retried admin-notify for the SAME order.
        const order = await Order.findById(res.body.data._id);
        await notifyAdminOfNewOrder(order!);

        expect(await Notification.countDocuments({ type: 'order_pending_approval' })).toBe(1);
    });

    it('creates a registration_pending notification with a deep link, idempotently', async () => {
        const admin = await createAdmin();
        const res = await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
        expect(res.status).toBe(202);

        const registered = await User.findOne({ email: VALID_REGISTRATION.email });
        const first = await Notification.find({ type: 'registration_pending' }).lean();
        expect(first).toHaveLength(1);
        expect(String(first[0].recipient)).toBe(String(admin._id));
        expect(first[0].link).toBe(`/admin/registrations/${registered!._id}`);

        // Retried admin-notify for the SAME registration adds nothing.
        await notifyAdminOfRegistration(registered!);
        expect(await Notification.countDocuments({ type: 'registration_pending' })).toBe(1);
    });

    it('lists, marks read, and marks all read for the admin only', async () => {
        const admin = await createAdmin();
        const adminCookie = authCookieFor(admin);
        const { cookie } = await approvedCustomer('c');
        await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'NOTIF-5L', quantity: 1 }], paymentPreference: 'bank_transfer' });

        const list = await request(app).get('/api/v1/notifications').set('Cookie', adminCookie);
        expect(list.status).toBe(200);
        expect(list.body.unreadCount).toBe(1);
        const id = list.body.data[0]._id;

        const markOne = await request(app).post(`/api/v1/notifications/${id}/read`).set('Cookie', adminCookie);
        expect(markOne.status).toBe(200);
        expect(markOne.body.data.isRead).toBe(true);

        const markAll = await request(app).post('/api/v1/notifications/read-all').set('Cookie', adminCookie);
        expect(markAll.status).toBe(200);
        const after = await request(app).get('/api/v1/notifications').set('Cookie', adminCookie);
        expect(after.body.unreadCount).toBe(0);
    });

    it('rejects customers and anonymous callers', async () => {
        const { cookie } = await approvedCustomer('d');

        expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
        expect((await request(app).get('/api/v1/notifications').set('Cookie', cookie)).status).toBe(403);
        expect((await request(app).post('/api/v1/notifications/read-all').set('Cookie', cookie)).status).toBe(403);
    });

    it('notification failure does not lose the order', async () => {
        await createAdmin();
        const { cookie } = await approvedCustomer('e');
        // Force Notification.create to fail for this call only.
        const original = Notification.create.bind(Notification);
        (Notification as unknown as { create: unknown }).create = async () => {
            throw new Error('notification store down');
        };
        try {
            const res = await request(app)
                .post('/api/v1/me/orders')
                .set('Cookie', cookie)
                .send({ items: [{ sku: 'NOTIF-5L', quantity: 1 }], paymentPreference: 'bank_transfer' });
            expect(res.status).toBe(201);
            expect(await Order.countDocuments()).toBe(1);
        } finally {
            (Notification as unknown as { create: unknown }).create = original;
        }
    });
});
