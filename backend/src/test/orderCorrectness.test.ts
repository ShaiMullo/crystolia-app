// Round-2 correctness guarantees: all-or-nothing multi-line reservation,
// exactly-one concurrent transition + single invoice, safe shipment,
// CRM/legacy route parity, and catalog availability matching the location
// reservations actually use.

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
import { getCustomerCatalog } from '../services/catalogService.js';

const app = buildTestApp();

beforeAll(async () => {
    await startTestDb();
    await Invoice.init(); // build the partial unique index on Invoice.order
});
afterAll(async () => {
    await stopTestDb();
});

let counter = 0;
async function makeTrackedProduct(sku: string, stock: number | null) {
    const product = await Product.create({
        name: `מוצר ${sku}`,
        sku,
        price: 50,
        taxRate: 0,
        stockTrackingEnabled: true,
    });
    if (stock !== null) {
        await Inventory.create({ product: product._id, location: 'main', quantity: stock, reservedQuantity: 0 });
    }
    return product;
}

async function makeOrderWith(items: Array<{ productId: unknown; productName: string; quantity: number }>) {
    counter += 1;
    const company = await Company.create({ name: `חברת נכונות ${counter}`, vatNumber: `55500000${counter}` });
    const customer = await User.create({
        name: 'לקוח נכונות',
        email: `correct-${counter}@example.com`,
        password: 'CorrectPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return Order.create({
        company: company._id,
        createdBy: customer._id,
        items: items.map((i) => ({ ...i, price: 50 })),
        totalAmount: 50 * items.reduce((s, i) => s + i.quantity, 0),
        status: 'pending',
        paymentPreference: 'bank_transfer',
        timeline: [],
    });
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

describe('multi-line reservation is all-or-nothing', () => {
    it('one insufficient line leaves ZERO partial reservations', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const good = await makeTrackedProduct('AON-GOOD', 100);
        const bad = await makeTrackedProduct('AON-BAD', 1); // needs 5, has 1
        const order = await makeOrderWith([
            { productId: good._id, productName: 'טוב', quantity: 4 },
            { productId: bad._id, productName: 'חסר', quantity: 5 },
        ]);

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'approved' });
        expect(res.status).toBe(409);

        // The GOOD line must not stay reserved after the BAD line failed.
        const goodRow = await Inventory.findOne({ product: good._id }).lean();
        const badRow = await Inventory.findOne({ product: bad._id }).lean();
        expect(goodRow?.reservedQuantity).toBe(0);
        expect(badRow?.reservedQuantity).toBe(0);
        expect((await Order.findById(order._id).lean())?.status).toBe('pending');
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
    });

    it('all lines sufficient → every line reserved and the order approved', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const a = await makeTrackedProduct('AON-A', 10);
        const b = await makeTrackedProduct('AON-B', 10);
        const order = await makeOrderWith([
            { productId: a._id, productName: 'א', quantity: 3 },
            { productId: b._id, productName: 'ב', quantity: 7 },
        ]);

        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'approved' });
        expect(res.status).toBe(200);
        expect((await Inventory.findOne({ product: a._id }).lean())?.reservedQuantity).toBe(3);
        expect((await Inventory.findOne({ product: b._id }).lean())?.reservedQuantity).toBe(7);
        expect((await Order.findById(order._id).lean())?.inventoryReserved).toBe(true);
    });
});

describe('concurrent approval: exactly one transition, one reservation set, one invoice', () => {
    it('two simultaneous approvals of the same pending order', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const product = await makeTrackedProduct('CONC-1', 10);
        const order = await makeOrderWith([{ productId: product._id, productName: 'מקביל', quantity: 4 }]);

        const [r1, r2] = await Promise.all([
            request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' }),
            request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' }),
        ]);

        const statuses = [r1.status, r2.status].sort();
        expect(statuses).toEqual([200, 409]);

        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(4); // once, not twice
        expect(await Invoice.countDocuments({ order: order._id })).toBe(1);
        expect((await Order.findById(order._id).lean())?.status).toBe('approved');
    });

    it('Invoice.order is unique at the database level', async () => {
        const product = await makeTrackedProduct('INVU-1', 10);
        const order = await makeOrderWith([{ productId: product._id, productName: 'חשבונית', quantity: 1 }]);
        await Invoice.create({ company: order.company, order: order._id, invoiceNumber: 'INV-U-1', totalAmount: 50, status: 'draft' });
        await expect(
            Invoice.create({ company: order.company, order: order._id, invoiceNumber: 'INV-U-2', totalAmount: 50, status: 'draft' }),
        ).rejects.toMatchObject({ code: 11000 });
        // Order-less (manual) invoices remain unlimited.
        await Invoice.create({ company: order.company, invoiceNumber: 'INV-U-3', totalAmount: 10, status: 'draft' });
        await Invoice.create({ company: order.company, invoiceNumber: 'INV-U-4', totalAmount: 10, status: 'draft' });
    });
});

describe('shipment is safe', () => {
    it('a failed shipment keeps the order approved with its reservation intact', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const product = await makeTrackedProduct('SHIP-F', 10);
        const order = await makeOrderWith([{ productId: product._id, productName: 'משלוח', quantity: 4 }]);

        expect((await request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' })).status).toBe(200);

        // Stock disappears (external adjustment) below the reserved amount.
        await Inventory.updateOne({ product: product._id }, { $set: { quantity: 2 } });

        const shipped = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'shipped' });
        expect(shipped.status).toBe(409);
        expect(shipped.body.message || shipped.body.error).toMatch(/Cannot ship/i);

        const stored = await Order.findById(order._id).lean();
        expect(stored?.status).toBe('approved');           // unchanged
        expect(stored?.inventoryReserved).toBe(true);      // reservation kept
        const row = await Inventory.findOne({ product: product._id }).lean();
        expect(row?.reservedQuantity).toBe(4);             // untouched
        expect(row?.quantity).toBe(2);                     // nothing deducted
    });

    it('a multi-line shipment failure leaves no partially-shipped lines', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const a = await makeTrackedProduct('SHIP-A', 10);
        const b = await makeTrackedProduct('SHIP-B', 10);
        const order = await makeOrderWith([
            { productId: a._id, productName: 'א', quantity: 3 },
            { productId: b._id, productName: 'ב', quantity: 3 },
        ]);
        expect((await request(app).patch(`/api/orders/${order._id}`).set('Cookie', cookie).send({ status: 'approved' })).status).toBe(200);

        // Second line becomes unshippable.
        await Inventory.updateOne({ product: b._id }, { $set: { quantity: 1, reservedQuantity: 1 } });

        const shipped = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'shipped' });
        expect(shipped.status).toBe(409);

        // Line A must be fully restored: nothing deducted, reservation kept.
        const rowA = await Inventory.findOne({ product: a._id }).lean();
        expect(rowA?.quantity).toBe(10);
        expect(rowA?.reservedQuantity).toBe(3);
        expect((await Order.findById(order._id).lean())?.status).toBe('approved');
    });
});

describe('CRM and legacy routes behave identically', () => {
    it('CRM PATCH fails closed on zero stock exactly like the legacy route', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const product = await makeTrackedProduct('CRM-Z', 0);
        const order = await makeOrderWith([{ productId: product._id, productName: 'קרמ', quantity: 2 }]);

        const res = await request(app)
            .patch(`/api/v1/orders/${order._id}`)
            .set('Cookie', cookie)
            .send({ status: 'approved' });
        expect(res.status).toBe(409);
        expect((await Order.findById(order._id).lean())?.status).toBe('pending');
        expect(await Invoice.countDocuments({ order: order._id })).toBe(0);
    });

    it('CRM create-as-approved runs the same workflow: reservation failure → created pending with approvalError', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const product = await makeTrackedProduct('CRM-CA', 1);
        counter += 1;
        const company = await Company.create({ name: `חברת CRM ${counter}`, vatNumber: `54400000${counter}` });

        const res = await request(app)
            .post('/api/v1/orders')
            .set('Cookie', cookie)
            .send({
                companyId: company._id.toString(),
                status: 'approved',
                items: [{ productId: product._id.toString(), productName: 'קרמ', quantity: 5, price: 50 }],
            });
        expect(res.status).toBe(201);
        expect(res.body.approvalError).toMatch(/reservation failed/i);
        expect(res.body.data.status).toBe('pending');
        expect((await Inventory.findOne({ product: product._id }).lean())?.reservedQuantity).toBe(0);
    });

    it('CRM create-as-approved succeeds end-to-end when stock exists (reservation + invoice)', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);
        const product = await makeTrackedProduct('CRM-OK', 10);
        counter += 1;
        const company = await Company.create({ name: `חברת CRM ${counter}`, vatNumber: `54400000${counter}` });

        const res = await request(app)
            .post('/api/v1/orders')
            .set('Cookie', cookie)
            .send({
                companyId: company._id.toString(),
                status: 'approved',
                items: [{ productId: product._id.toString(), productName: 'קרמ', quantity: 5, price: 50 }],
            });
        expect(res.status).toBe(201);
        expect(res.body.approvalError).toBeUndefined();
        expect(res.body.data.status).toBe('approved');
        expect((await Inventory.findOne({ product: product._id }).lean())?.reservedQuantity).toBe(5);
        expect(await Invoice.countDocuments({ order: res.body.data._id })).toBe(1);
    });
});

describe('displayed availability matches the reservation location', () => {
    it('customer catalog counts main-location stock only', async () => {
        const product = await makeTrackedProduct('LOC-1', 5); // main: 5
        await Inventory.create({ product: product._id, location: 'warehouse-b', quantity: 100, reservedQuantity: 0 });

        const catalog = await getCustomerCatalog();
        const item = catalog.find((c: { sku: string }) => c.sku === 'LOC-1');
        // Before the fix this showed 105 while reservation could only use 5.
        expect(item?.available).toBe(5);
    });
});
