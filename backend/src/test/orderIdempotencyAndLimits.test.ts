// Duplicate-submission protection (clientRequestId) and the order-creation
// rate limit.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    authCookieFor,
    PAYMENT_OPTIONS_BANK_ENABLED,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb();
    await Order.init(); // ensure the partial unique index exists before racing
});
afterAll(async () => {
    await stopTestDb();
});

let counter = 0;
async function approvedCustomer() {
    counter += 1;
    const company = await Company.create({ name: `לקוח כפילות ${counter}`, vatNumber: `56600000${counter}` });
    const customer = await User.create({
        name: 'לקוח כפילות',
        email: `dedupe-${counter}@example.com`,
        password: 'DedupePass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return authCookieFor(customer);
}

function orderBody(clientRequestId?: unknown) {
    return {
        items: [{ sku: 'DEDUPE-1L', quantity: 2 }],
        paymentPreference: 'bank_transfer',
        ...(clientRequestId !== undefined ? { clientRequestId } : {}),
    };
}

beforeEach(async () => {
    await clearDb();
    await Order.init();
    await Product.create({ name: 'שמן 1L', sku: 'DEDUPE-1L', price: 30, taxRate: 0, stockTrackingEnabled: false });
    await Settings.create({
        key: 'business',
        minimumOrderAmount: 0,
        currency: 'ILS',
        boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
});

describe('clientRequestId dedupe', () => {
    it('a resubmitted clientRequestId returns the SAME order instead of creating a second one', async () => {
        const cookie = await approvedCustomer();
        const id = 'e2c1b7d0-6f3a-4b58-9d21-000000000001';

        const first = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody(id));
        expect(first.status).toBe(201);

        const second = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody(id));
        expect(second.status).toBe(200);
        expect(second.body.deduplicated).toBe(true);
        expect(second.body.data._id).toBe(first.body.data._id);
        expect(await Order.countDocuments()).toBe(1);
    });

    it('different clientRequestIds create separate orders; omitting it keeps legacy behavior', async () => {
        const cookie = await approvedCustomer();
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('req-11111111'))).status).toBe(201);
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('req-22222222'))).status).toBe(201);
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody())).status).toBe(201);
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody())).status).toBe(201);
        expect(await Order.countDocuments()).toBe(4);
    });

    it('the same clientRequestId is scoped per user — two customers may share one', async () => {
        const cookieA = await approvedCustomer();
        const cookieB = await approvedCustomer();
        const id = 'shared-req-0001';
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookieA).send(orderBody(id))).status).toBe(201);
        expect((await request(app).post('/api/v1/me/orders').set('Cookie', cookieB).send(orderBody(id))).status).toBe(201);
        expect(await Order.countDocuments()).toBe(2);
    });

    it('rejects malformed clientRequestId values', async () => {
        const cookie = await approvedCustomer();
        for (const bad of ['short', 'a'.repeat(65), 'has spaces here', 'שם-בעברית-123', 42, { evil: true }]) {
            const res = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody(bad));
            expect(res.status, `clientRequestId ${JSON.stringify(bad)}`).toBe(400);
        }
        expect(await Order.countDocuments()).toBe(0);
    });
});

describe('order rate limit', () => {
    afterEach(() => {
        process.env.ORDER_RATE_LIMIT_MAX = '10000';
    });

    it('throttles a flood of order submissions per user', async () => {
        process.env.ORDER_RATE_LIMIT_MAX = '3';
        const cookie = await approvedCustomer();

        const statuses: number[] = [];
        for (let i = 0; i < 5; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody());
            statuses.push(res.status);
        }
        expect(statuses.filter((s) => s === 201)).toHaveLength(3);
        expect(statuses.filter((s) => s === 429)).toHaveLength(2);
        expect(await Order.countDocuments()).toBe(3);
    });
});
