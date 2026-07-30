// Order status state machine + idempotent inventory reservation:
// illegal jumps are refused, reopen releases stock, re-approval cannot
// double-reserve, reservation failures surface instead of vanishing, and
// concurrent reservations cannot oversell.

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
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import { applyMovement } from '../services/inventoryService.js';
import { transitionError } from '../services/orderStatusService.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});

let counter = 0;
async function makeOrder(productOverrides: Record<string, unknown> = {}, quantity = 3) {
    counter += 1;
    const product = await Product.create({
        name: `מוצר מעבר ${counter}`,
        sku: `TRANS-${counter}`,
        price: 50,
        taxRate: 0,
        stockTrackingEnabled: true,
        ...productOverrides,
    });
    const company = await Company.create({ name: `חברת מעבר ${counter}`, vatNumber: `59900000${counter}` });
    const customer = await User.create({
        name: 'לקוח מעבר',
        email: `transition-${counter}@example.com`,
        password: 'TransPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    const order = await Order.create({
        company: company._id,
        createdBy: customer._id,
        items: [{ productId: product._id, productName: product.name, quantity, price: 50 }],
        totalAmount: 50 * quantity,
        status: 'pending',
        paymentPreference: 'bank_transfer',
        timeline: [],
    });
    return { product, order };
}

async function patchStatus(orderId: unknown, body: Record<string, unknown>, adminCookie: string) {
    return request(app).patch(`/api/orders/${orderId}`).set('Cookie', adminCookie).send(body);
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

describe('transition map', () => {
    it('rejects illegal jumps and allows the documented paths', () => {
        expect(transitionError('completed', 'pending')).toMatch(/Cannot change/);
        expect(transitionError('shipped', 'approved')).toMatch(/Cannot change/);
        expect(transitionError('pending', 'shipped')).toMatch(/Cannot change/);
        expect(transitionError('pending', 'completed')).toMatch(/Cannot change/);
        expect(transitionError('rejected', 'approved')).toMatch(/Cannot change/);
        for (const [from, to] of [
            ['pending', 'approved'], ['pending', 'rejected'], ['pending', 'cancelled'],
            ['approved', 'shipped'], ['approved', 'pending'], ['approved', 'cancelled'],
            ['shipped', 'completed'], ['rejected', 'pending'], ['cancelled', 'pending'],
        ] as const) {
            expect(transitionError(from, to), `${from}→${to}`).toBeNull();
        }
        expect(transitionError('completed', 'completed')).toBeNull(); // same-status no-op
    });

    it('refuses an illegal transition over the API with 409', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await makeOrder();
        await Order.updateOne({ _id: order._id }, { status: 'completed' });

        const res = await patchStatus(order._id, { status: 'pending' }, cookie);
        expect(res.status).toBe(409);
        expect((await Order.findById(order._id))?.status).toBe('completed');
    });
});

describe('reservation idempotency across reopen/re-approve', () => {
    it('approve → pending → approve reserves exactly once and releases in between', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await makeOrder({}, 3);
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 0 });

        expect((await patchStatus(order._id, { status: 'approved' }, cookie)).status).toBe(200);
        let row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(3);
        expect((await Order.findById(order._id))?.inventoryReserved).toBe(true);

        // Reopen: reservation must be released.
        expect((await patchStatus(order._id, { status: 'pending' }, cookie)).status).toBe(200);
        row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(0);
        expect((await Order.findById(order._id))?.inventoryReserved).toBe(false);

        // Re-approve: reserved once again — NOT accumulated to 6.
        expect((await patchStatus(order._id, { status: 'approved' }, cookie)).status).toBe(200);
        row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(3);
    });

    it('shipping consumes the reservation and deducts on-hand', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await makeOrder({}, 4);
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 0 });

        await patchStatus(order._id, { status: 'approved' }, cookie);
        await patchStatus(order._id, { status: 'shipped' }, cookie);

        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.quantity).toBe(6);
        expect(row?.reservedQuantity).toBe(0);
        expect((await Order.findById(order._id))?.inventoryReserved).toBe(false);
    });
});

describe('approval fails closed on reservation failure', () => {
    it('zero stock: approval returns 409, order stays pending, no invoice, no reserved flag', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await makeOrder({}, 5);
        // Tracked product with an empty inventory row → reservation must fail.
        await Inventory.create({ product: product._id, location: 'main', quantity: 0, reservedQuantity: 0 });

        const res = await patchStatus(order._id, { status: 'approved' }, cookie);
        expect(res.status).toBe(409);
        expect(res.body.message || res.body.error).toMatch(/stock reservation failed/i);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect(stored?.inventoryReserved).not.toBe(true);
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(0);
    });

    it('a missing Inventory row is NOT a successful approval', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await makeOrder({}, 2); // tracked product, no Inventory row at all

        const res = await patchStatus(order._id, { status: 'approved' }, cookie);
        expect(res.status).toBe(409);
        expect((await Order.findById(order._id).lean())?.status).toBe('pending');
    });

    it('untracked products never block approval', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { order } = await makeOrder({ stockTrackingEnabled: false }, 2);

        const res = await patchStatus(order._id, { status: 'approved' }, cookie);
        expect(res.status).toBe(200);
        expect((await Order.findById(order._id).lean())?.status).toBe('approved');
    });
});

describe('concurrent reservation cannot oversell', () => {
    it('two simultaneous reservations for the last stock: exactly one wins', async () => {
        const product = await Product.create({
            name: 'מוצר מרוץ', sku: 'RACE-1', price: 10, taxRate: 0, stockTrackingEnabled: true,
        });
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 0 });

        const attempts = await Promise.allSettled([
            applyMovement({ productId: String(product._id), type: 'reserved', quantity: 8 }),
            applyMovement({ productId: String(product._id), type: 'reserved', quantity: 8 }),
        ]);

        const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
        expect(fulfilled).toHaveLength(1);
        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(8); // NOT 16
    });
});
