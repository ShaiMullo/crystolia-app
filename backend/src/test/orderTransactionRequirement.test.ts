// Standalone-mongod behavior: stock-tracked order processing REQUIRES
// transactions and must refuse with 503 (never best-effort compensation);
// untracked orders keep working; applyMovement's sessionless revert keeps
// summary and movement log in sync; and the unique Invoice.order index is
// an explicit readiness condition.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
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
import InventoryMovement from '../models/InventoryMovement.js';
import { applyMovement } from '../services/inventoryService.js';
import { recheckInvoiceIndexReadiness } from '../db/indexReadiness.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb(); // deliberately STANDALONE — no transactions
});
afterAll(async () => {
    await stopTestDb();
});
afterEach(() => {
    vi.restoreAllMocks();
});

let counter = 0;
async function customerOrder(productOverrides: Record<string, unknown>, quantity = 2) {
    counter += 1;
    const product = await Product.create({
        name: `מוצר עצמאי ${counter}`,
        sku: `STA-${counter}`,
        price: 40,
        taxRate: 0,
        ...productOverrides,
    });
    const company = await Company.create({ name: `חברה עצמאית ${counter}`, vatNumber: `52200000${counter}` });
    const customer = await User.create({
        name: 'לקוח עצמאי',
        email: `standalone-${counter}@example.com`,
        password: 'StandalonePass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    const order = await Order.create({
        company: company._id,
        createdBy: customer._id,
        items: [{ productId: product._id, productName: product.name, quantity, price: 40 }],
        totalAmount: 40 * quantity,
        status: 'pending',
        paymentPreference: 'bank_transfer',
        timeline: [],
    });
    return { product, order };
}

beforeEach(async () => {
    await clearDb();
    await recheckInvoiceIndexReadiness();
    await Settings.create({
        key: 'business',
        minimumOrderAmount: 0,
        currency: 'ILS',
        boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
});

describe('transaction requirement on standalone MongoDB', () => {
    it('approving a stock-tracked order returns 503 with an operational error — nothing is written', async () => {
        const admin = await createAdmin();
        const { product, order } = await customerOrder({ stockTrackingEnabled: true });
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 0 });

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(503);
        expect(res.body.message || res.body.error).toMatch(/replica set/i);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect((await Inventory.findOne({ product: product._id }).lean())?.reservedQuantity).toBe(0);
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
    });

    it('untracked-product orders keep working end-to-end (safe non-inventory path)', async () => {
        const admin = await createAdmin();
        const { order } = await customerOrder({ stockTrackingEnabled: false });

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(200);
        expect((await Order.findById(order._id).lean())?.status).toBe('approved');
        expect(await Invoice.countDocuments({ order: order._id })).toBe(1);
    });

    it('untracked path: invoice failure aborts BEFORE the status commit', async () => {
        const admin = await createAdmin();
        const { order } = await customerOrder({ stockTrackingEnabled: false });

        vi.spyOn(Invoice, 'create').mockRejectedValueOnce(new Error('injected invoice failure'));

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(500);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect(stored?.statusLockAt ?? null).toBeNull(); // lock released on failure
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
        expect(stored?.timeline.some((e: { type: string }) => e.type === 'customer_order_notification')).toBe(false);
    });
});

describe('applyMovement sessionless revert (summary/log consistency)', () => {
    it('reverts the summary exactly when the movement-log write fails', async () => {
        const product = await Product.create({
            name: 'מוצר היפוך', sku: 'REV-1', price: 10, taxRate: 0, stockTrackingEnabled: true,
        });
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 2 });

        vi.spyOn(InventoryMovement, 'create').mockRejectedValueOnce(new Error('injected log failure'));
        await expect(
            applyMovement({ productId: String(product._id), type: 'reserved', quantity: 5 }),
        ).rejects.toThrow('injected log failure');

        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(2); // reverted, not 7
        expect(await InventoryMovement.countDocuments({ product: product._id })).toBe(0);
    });

    it('the released clamp reverts by its true delta, not the requested amount', async () => {
        const product = await Product.create({
            name: 'מוצר קלמפ', sku: 'REV-2', price: 10, taxRate: 0, stockTrackingEnabled: true,
        });
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 1 });

        vi.spyOn(InventoryMovement, 'create').mockRejectedValueOnce(new Error('injected log failure'));
        // Release 5 with only 1 reserved: clamped delta is 1 — the revert
        // must restore exactly 1, never +5.
        await expect(
            applyMovement({ productId: String(product._id), type: 'released', quantity: 5 }),
        ).rejects.toThrow('injected log failure');

        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(1);
    });
});

describe('Invoice.order unique index readiness', () => {
    it('index failure is surfaced as not-ready and blocks approvals until fixed', async () => {
        const admin = await createAdmin();
        const { order } = await customerOrder({ stockTrackingEnabled: false });

        // Break the invariant the way legacy production data could: drop
        // the index and insert duplicate invoices for one order.
        await Invoice.collection.dropIndex('order_1');
        const otherOrderId = order._id;
        await Invoice.create({ company: order.company, order: otherOrderId, invoiceNumber: 'DUP-1', totalAmount: 10, status: 'draft' });
        await Invoice.create({ company: order.company, order: otherOrderId, invoiceNumber: 'DUP-2', totalAmount: 10, status: 'draft' });

        const broken = await recheckInvoiceIndexReadiness();
        expect(broken.ready).toBe(false);
        expect(broken.reason).toBeTruthy();

        // Approval refuses to run rather than silently continuing without
        // its concurrency guarantee.
        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(503);
        expect(res.body.message || res.body.error).toMatch(/temporarily unavailable/i);
        expect((await Order.findById(order._id).lean())?.status).toBe('pending');

        // Operator fixes the data → recheck → ready again, approval works.
        await Invoice.deleteOne({ invoiceNumber: 'DUP-2' });
        const fixed = await recheckInvoiceIndexReadiness();
        expect(fixed.ready).toBe(true);
    });
});
