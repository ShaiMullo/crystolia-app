// Failure-injection tests for the transactional order workflow (replica
// set): any failure inside the transition — movement log, order commit,
// release, invoice — must leave NO partial state behind.

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
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import InventoryMovement from '../models/InventoryMovement.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb({ replSet: true });
    await Invoice.init();
});
afterAll(async () => {
    await stopTestDb();
});
afterEach(() => {
    vi.restoreAllMocks();
});

let counter = 0;
async function trackedOrder(stock: number, quantity = 3) {
    counter += 1;
    const product = await Product.create({
        name: `מוצר הזרקה ${counter}`,
        sku: `INJ-${counter}`,
        price: 50,
        taxRate: 0,
        stockTrackingEnabled: true,
    });
    await Inventory.create({ product: product._id, location: 'main', quantity: stock, reservedQuantity: 0 });
    const company = await Company.create({ name: `חברת הזרקה ${counter}`, vatNumber: `53300000${counter}` });
    const customer = await User.create({
        name: 'לקוח הזרקה',
        email: `inject-${counter}@example.com`,
        password: 'InjectPass1',
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

beforeEach(async () => {
    await clearDb();
    await Invoice.init();
    await Settings.create({
        key: 'business',
        minimumOrderAmount: 0,
        currency: 'ILS',
        boxPrices: [],
        paymentOptions: PAYMENT_OPTIONS_BANK_ENABLED,
    });
});

describe('failure injection: transaction leaves no partial state', () => {
    it('InventoryMovement.create failure → no summary drift, order stays pending', async () => {
        const admin = await createAdmin();
        const { product, order } = await trackedOrder(10);

        vi.spyOn(InventoryMovement, 'create').mockRejectedValueOnce(new Error('injected movement-log failure'));

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(409);
        expect(res.body.message || res.body.error).toMatch(/stock reservation failed/i);

        // Transaction aborted: summary untouched, log empty, no lock left.
        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(0);
        expect(await InventoryMovement.countDocuments({ relatedOrder: order._id })).toBe(0);
        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect(stored?.statusLockAt ?? null).toBeNull();
    });

    it('order commit failure after reservation → no orphan reservation', async () => {
        const admin = await createAdmin();
        const { product, order } = await trackedOrder(10);

        vi.spyOn(Order.prototype, 'save').mockRejectedValueOnce(new Error('injected commit failure'));

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBeGreaterThanOrEqual(500);

        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(0);                          // aborted with the txn
        expect(await InventoryMovement.countDocuments({ relatedOrder: order._id })).toBe(0);
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect(stored?.statusLockAt ?? null).toBeNull();                // lock aborted too
        expect(stored?.inventoryReserved).not.toBe(true);
    });

    it('release failure → order remains approved and inventoryReserved stays true', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await trackedOrder(10, 4);

        expect((await request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' })).status).toBe(200);

        // Make the release fail: the product disappears.
        await Product.updateOne({ _id: product._id }, { $set: { isDeleted: true, deletedAt: new Date() } });

        const cancel = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'cancelled' });
        expect(cancel.status).toBe(409);
        expect(cancel.body.message || cancel.body.error).toMatch(/stock release failed/i);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('approved');            // previous state kept
        expect(stored?.inventoryReserved).toBe(true);       // flag NOT flipped
        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(4);              // reservation intact
    });

    it('invoice creation failure → order remains pending, nothing reserved, no notification', async () => {
        const admin = await createAdmin();
        const { product, order } = await trackedOrder(10);

        vi.spyOn(Invoice, 'create').mockRejectedValueOnce(new Error('injected invoice failure'));

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(500);
        expect(res.body.message || res.body.error).toMatch(/Invoice creation failed/i);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('pending');
        expect(stored?.inventoryReserved).not.toBe(true);
        // The reservation from the same transaction rolled back with it.
        expect((await Inventory.findOne({ product: product._id }).lean())?.reservedQuantity).toBe(0);
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
        // Approval notification must not have gone out (it is timeline-recorded).
        expect(stored?.timeline.some((e: { type: string }) => e.type === 'customer_order_notification')).toBe(false);
    });
});

describe('/api/ready on a replica set', () => {
    it('reports ready with the topology once the invoice index exists', async () => {
        const res = await request(app).get('/api/ready');
        expect(res.status).toBe(200);
        expect(res.body.ready).toBe(true);
        expect(res.body.topology).toBe('replica_set');
    });
});

describe('transactional production stock writers', () => {
    it('manual inventory movement commits summary + movement together', async () => {
        const admin = await createAdmin();
        const product = await Product.create({
            name: 'מוצר ידני', sku: 'MAN-TXN', price: 10, taxRate: 0, stockTrackingEnabled: true,
        });
        await Inventory.create({ product: product._id, location: 'main', quantity: 5, reservedQuantity: 0 });

        const res = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', authCookieFor(admin))
            .send({ productId: product._id.toString(), type: 'in', quantity: 3 });
        expect(res.status).toBe(201);

        expect((await Inventory.findOne({ product: product._id }).lean())?.quantity).toBe(8);
        expect(await InventoryMovement.countDocuments({ product: product._id, type: 'in' })).toBe(1);
    });

    it('PO receiving failure rolls back PO status, received quantities, summary and movement log', async () => {
        const admin = await createAdmin();
        const product = await Product.create({
            name: 'מוצר רכש', sku: 'PO-TXN', price: 10, taxRate: 0, stockTrackingEnabled: true,
        });
        await Inventory.create({ product: product._id, location: 'main', quantity: 1, reservedQuantity: 0 });
        const po = await PurchaseOrder.create({
            poNumber: 'PO-TXN-1',
            supplier: new mongoose.Types.ObjectId(),
            status: 'ordered',
            items: [{ product: product._id, productName: product.name, quantity: 10, receivedQuantity: 0, unitCost: 5 }],
            totalCost: 50,
            timeline: [],
        });

        // The movement-log write fails mid-receiving → the WHOLE receive
        // transaction (PO line, PO status, inventory summary) must abort.
        vi.spyOn(InventoryMovement, 'create').mockRejectedValueOnce(new Error('injected PO log failure'));

        const res = await request(app)
            .post(`/api/v1/purchase-orders/${po._id}/receive`)
            .set('Cookie', authCookieFor(admin))
            .send({ receipts: [{ productId: product._id.toString(), quantity: 4 }] });
        expect(res.status).toBeGreaterThanOrEqual(500);

        const stored = await PurchaseOrder.findById(po._id).lean();
        expect(stored?.status).toBe('ordered');
        expect(stored?.items[0].receivedQuantity).toBe(0);
        expect((await Inventory.findOne({ product: product._id }).lean())?.quantity).toBe(1);
        expect(await InventoryMovement.countDocuments({ product: product._id })).toBe(0);

        // And a clean retry succeeds end-to-end.
        const retry = await request(app)
            .post(`/api/v1/purchase-orders/${po._id}/receive`)
            .set('Cookie', authCookieFor(admin))
            .send({ receipts: [{ productId: product._id.toString(), quantity: 4 }] });
        expect(retry.status).toBe(200);
        const after = await PurchaseOrder.findById(po._id).lean();
        expect(after?.status).toBe('partially_received');
        expect(after?.items[0].receivedQuantity).toBe(4);
        expect((await Inventory.findOne({ product: product._id }).lean())?.quantity).toBe(5);
    });
});

describe('concurrent CRM item edit vs approval', () => {
    it('either the edit lands before the reservation or it gets 409 — approved lines always match reserved stock', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await trackedOrder(100, 3);

        const [editRes, approveRes] = await Promise.all([
            request(app)
                .patch(`/api/v1/orders/${order._id}`)
                .set('Cookie', cookie)
                .send({
                    items: [{ productId: product._id.toString(), productName: 'ערוך', quantity: 7, price: 50 }],
                }),
            request(app)
                .patch(`/api/orders/${order._id}`)
                .set('Cookie', cookie)
                .send({ status: 'approved' }),
        ]);

        expect([200, 409]).toContain(editRes.status);
        expect([200, 409]).toContain(approveRes.status);

        const stored = await Order.findById(order._id).lean();
        if (stored?.status === 'approved') {
            // Whatever line set got approved is EXACTLY what is reserved.
            const orderedQty = stored.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
            const row = await Inventory.findOne({ product: product._id }).lean();
            expect(row?.reservedQuantity).toBe(orderedQty);
        }
        // An edit that reported success must be visible on the document.
        if (editRes.status === 200 && stored?.status === 'approved') {
            expect(stored.items[0].quantity).toBe(7);
        }
    });

    it('item edits are refused once the order is approved', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const { product, order } = await trackedOrder(10, 2);
        expect((await request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' })).status).toBe(200);

        const edit = await request(app)
            .patch(`/api/v1/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ items: [{ productId: product._id.toString(), productName: 'ערוך', quantity: 9, price: 50 }] });
        expect(edit.status).toBe(409);
        expect((await Order.findById(order._id).lean())?.items[0].quantity).toBe(2);
    });
});
