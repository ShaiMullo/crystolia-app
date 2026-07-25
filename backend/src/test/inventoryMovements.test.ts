// POST /api/v1/inventory/movements — the opening-stock workflow. The first
// "in" movement for a (product, location) must create exactly one Inventory
// row plus one InventoryMovement record; later movements reuse the same row.
// Also covers the admin-only gate, validation rejections, and the concurrent
// first-movement race that getOrCreateInventoryRow's atomic upsert absorbs.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    createAdmin,
    authCookieFor,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { applyMovement } from '../services/inventoryService.js';

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

async function adminCookie() {
    return authCookieFor(await createAdmin());
}

async function trackedProduct(overrides: Record<string, unknown> = {}) {
    return Product.create({
        name: 'שמן חמניות קריסטוליה 5L',
        sku: `TRK-${Math.floor(Math.random() * 1_000_000)}`,
        price: 15.9,
        stockTrackingEnabled: true,
        ...overrides,
    });
}

describe('POST /api/v1/inventory/movements — opening stock', () => {
    it('creates exactly one Inventory row and one movement for a product with no row', async () => {
        const cookie = await adminCookie();
        const product = await trackedProduct();
        expect(await Inventory.countDocuments()).toBe(0);

        const res = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: String(product._id), type: 'in', quantity: 25, reason: 'Opening stock' });

        expect(res.status).toBe(201);
        expect(res.body.data.inventory).toMatchObject({
            location: 'main',
            quantity: 25,
            reservedQuantity: 0,
        });

        const rows = await Inventory.find({ product: product._id }).lean();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ location: 'main', quantity: 25, reservedQuantity: 0 });
        // availableQuantity as exposed by the list endpoint
        const list = await request(app).get('/api/v1/inventory').set('Cookie', cookie);
        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].availableQuantity).toBe(25);

        const movements = await InventoryMovement.find({ product: product._id }).lean();
        expect(movements).toHaveLength(1);
        expect(movements[0]).toMatchObject({ type: 'in', quantity: 25, location: 'main', reason: 'Opening stock' });
    });

    it('updates the same row on a second movement instead of creating a duplicate', async () => {
        const cookie = await adminCookie();
        const product = await trackedProduct();

        for (const quantity of [10, 5]) {
            const res = await request(app)
                .post('/api/v1/inventory/movements')
                .set('Cookie', cookie)
                .send({ productId: String(product._id), type: 'in', quantity });
            expect(res.status).toBe(201);
        }

        const rows = await Inventory.find({ product: product._id }).lean();
        expect(rows).toHaveLength(1);
        expect(rows[0].quantity).toBe(15);
        expect(await InventoryMovement.countDocuments({ product: product._id })).toBe(2);
    });

    it('does not touch an existing reservation when stock is added', async () => {
        const cookie = await adminCookie();
        const product = await trackedProduct();
        await Inventory.create({ product: product._id, location: 'main', quantity: 10, reservedQuantity: 4 });

        const res = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: String(product._id), type: 'in', quantity: 6 });

        expect(res.status).toBe(201);
        const row = await Inventory.findOne({ product: product._id, location: 'main' }).lean();
        expect(row).toMatchObject({ quantity: 16, reservedQuantity: 4 });
    });

    it('respects an explicit location and keeps (product, location) rows separate', async () => {
        const cookie = await adminCookie();
        const product = await trackedProduct();

        await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: String(product._id), type: 'in', quantity: 3, location: 'north' })
            .expect(201);
        await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: String(product._id), type: 'in', quantity: 2 })
            .expect(201);

        const rows = await Inventory.find({ product: product._id }).sort({ location: 1 }).lean();
        expect(rows.map((r) => ({ location: r.location, quantity: r.quantity }))).toEqual([
            { location: 'main', quantity: 2 },
            { location: 'north', quantity: 3 },
        ]);
    });

    it('rejects non-admin callers', async () => {
        const product = await trackedProduct();
        const company = await Company.create({ name: 'לקוח מלאי', vatNumber: '566666666' });
        const customer = await User.create({
            name: 'לקוח מלאי',
            email: 'inventory-customer@example.com',
            password: 'CustomerPass1',
            role: 'customer',
            company: company._id,
            isActive: true,
            registrationStatus: 'approved',
        });

        const anonymous = await request(app)
            .post('/api/v1/inventory/movements')
            .send({ productId: String(product._id), type: 'in', quantity: 1 });
        expect(anonymous.status).toBe(401);

        const asCustomer = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', authCookieFor(customer))
            .send({ productId: String(product._id), type: 'in', quantity: 1 });
        expect(asCustomer.status).toBe(403);

        expect(await Inventory.countDocuments()).toBe(0);
        expect(await InventoryMovement.countDocuments()).toBe(0);
    });

    it('rejects unknown and soft-deleted products and invalid quantities', async () => {
        const cookie = await adminCookie();
        const deleted = await trackedProduct({ isDeleted: true, deletedAt: new Date() });
        const product = await trackedProduct();

        const unknown = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: '64b000000000000000000000', type: 'in', quantity: 1 });
        expect(unknown.status).toBe(404);

        const gone = await request(app)
            .post('/api/v1/inventory/movements')
            .set('Cookie', cookie)
            .send({ productId: String(deleted._id), type: 'in', quantity: 1 });
        expect(gone.status).toBe(404);

        for (const quantity of [0, -5, 'ten']) {
            const res = await request(app)
                .post('/api/v1/inventory/movements')
                .set('Cookie', cookie)
                .send({ productId: String(product._id), type: 'in', quantity });
            expect(res.status, `quantity ${quantity}`).toBe(400);
        }

        expect(await Inventory.countDocuments()).toBe(0);
        expect(await InventoryMovement.countDocuments()).toBe(0);
    });

    it('absorbs concurrent first movements into a single row (upsert race)', async () => {
        const product = await trackedProduct();

        // All three racers must succeed (none may die on a duplicate-key
        // error) and exactly ONE (product, location) row may exist afterwards.
        // The quantity SUM is deliberately not asserted here: applyMovement's
        // read-modify-write on quantity is pre-existing behavior outside this
        // change's scope — this test pins down row creation only.
        const results = await Promise.all(
            [7, 9, 4].map((quantity) =>
                applyMovement({ productId: String(product._id), type: 'in', quantity }),
            ),
        );
        expect(results).toHaveLength(3);

        const rows = await Inventory.find({ product: product._id }).lean();
        expect(rows).toHaveLength(1);
        expect(rows[0].quantity).toBeGreaterThan(0);
        expect(await InventoryMovement.countDocuments({ product: product._id })).toBe(3);
    });
});
