// POST /api/v1/me/orders — Product-first pricing with the legacy
// Settings.boxPrices fallback. Verifies the Product collection is
// authoritative for price/name/taxRate, that legacy-only SKUs keep working,
// and that server-side pricing/minimum-order rules cannot be bypassed.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

let customerCounter = 0;
async function approvedCustomer() {
    customerCounter += 1;
    const company = await Company.create({
        name: `לקוח הזמנות ${customerCounter}`,
        vatNumber: `55500000${customerCounter}`,
    });
    const customer = await User.create({
        name: 'לקוח הזמנות',
        email: `order-pricing-${customerCounter}@example.com`,
        password: 'OrderPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return authCookieFor(customer);
}

describe('order placement with the Product catalog', () => {
    it('orders a Product-only SKU without any Settings.boxPrices row', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED, boxPrices: [] });
        const product = await Product.create({
            name: 'שמן חמניות 0.9 ליטר',
            sku: 'SUN-09L',
            price: 12.5,
            taxRate: 17,
            stockTrackingEnabled: false,
        });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'SUN-09L', quantity: 4 }], paymentPreference: 'bank_transfer' });

        expect(res.status).toBe(201);
        const item = res.body.data.items[0];
        expect(item).toMatchObject({
            sku: 'SUN-09L',
            productName: 'שמן חמניות 0.9 ליטר',
            quantity: 4,
            price: 12.5,
            taxRate: 17,
        });
        expect(String(item.productId)).toBe(String(product._id));
        // 4 × 12.5 = 50 subtotal + 17% tax
        expect(res.body.data.subtotal).toBe(50);
        expect(res.body.data.taxTotal).toBe(8.5);
        expect(res.body.data.totalAmount).toBe(58.5);
    });

    it('blocks ordering when no Settings document (and therefore no payment method) exists', async () => {
        // Payment methods are admin-configured in Settings; without the
        // document nothing is enabled and ordering is closed by design.
        const cookie = await approvedCustomer();
        await Product.create({ name: 'מוצר עצמאי', sku: 'SOLO-1', price: 30, taxRate: 0, stockTrackingEnabled: false });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'SOLO-1', quantity: 1 }], paymentPreference: 'bank_transfer' });

        expect(res.status).toBe(400);
        expect(res.body.message || res.body.error).toContain('PAYMENT_METHODS_UNAVAILABLE');
    });

    it('uses the Product price/name and ignores client-supplied values', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED, boxPrices: [] });
        await Product.create({ name: 'שם אמיתי', sku: 'REAL-1', price: 80, taxRate: 0, stockTrackingEnabled: false });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'REAL-1', quantity: 2, productName: 'שם מזויף', price: 0.01 }], paymentPreference: 'bank_transfer' });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0]).toMatchObject({ productName: 'שם אמיתי', price: 80 });
        expect(res.body.data.totalAmount).toBe(160);

        const stored = await Order.findById(res.body.data._id).lean();
        expect(stored?.items[0]).toMatchObject({ productName: 'שם אמיתי', price: 80 });
    });

    it('prefers the Product over a legacy row with the same SKU', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
            boxPrices: [{ label: 'שם ישן', sku: 'DUP-1', pricePerUnit: 60, isActive: true }],
        });
        await Product.create({ name: 'שם חדש', sku: 'DUP-1', price: 72, taxRate: 17, stockTrackingEnabled: false });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'DUP-1', quantity: 1 }], paymentPreference: 'bank_transfer' });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0]).toMatchObject({
            productName: 'שם חדש',
            price: 72,
            taxRate: 17,
        });
    });

    it('still accepts a legacy-only SKU with its settings price', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
            boxPrices: [{ label: 'פריט ישן', sku: 'OLD-1', pricePerUnit: 60, isActive: true }],
        });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'OLD-1', quantity: 2 }], paymentPreference: 'bank_transfer' });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0]).toMatchObject({
            productName: 'פריט ישן',
            price: 60,
            taxRate: 0,
        });
        expect(res.body.data.items[0].productId).toBeUndefined();
        expect(res.body.data.totalAmount).toBe(120);
    });

    it('rejects unknown SKUs and inactive/deleted Product SKUs (no silent legacy fallback)', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
            boxPrices: [{ label: 'צל', sku: 'GONE-1', pricePerUnit: 50, isActive: true }],
        });
        await Product.create({ name: 'כבוי', sku: 'GONE-1', price: 50, isActive: false });
        await Product.create({ name: 'מחוק', sku: 'GONE-2', price: 50, isDeleted: true, deletedAt: new Date() });

        for (const sku of ['NOT-REAL', 'GONE-1', 'GONE-2']) {
            const res = await request(app)
                .post('/api/v1/me/orders')
                .set('Cookie', cookie)
                .send({ items: [{ sku, quantity: 1 }], paymentPreference: 'bank_transfer' });
            expect(res.status, `sku ${sku}`).toBe(400);
        }
        expect(await Order.countDocuments()).toBe(0);
    });

    it('enforces the minimum order amount against the server-calculated Product total', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({ key: 'business', minimumOrderAmount: 100, currency: 'ILS', paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED, boxPrices: [] });
        await Product.create({ name: 'מוצר זול', sku: 'CHEAP-1', price: 10, taxRate: 0, stockTrackingEnabled: false });

        const below = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'CHEAP-1', quantity: 3 }], paymentPreference: 'bank_transfer' });
        expect(below.status).toBe(400);

        const above = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'CHEAP-1', quantity: 10 }], paymentPreference: 'bank_transfer' });
        expect(above.status).toBe(201);
    });
});
