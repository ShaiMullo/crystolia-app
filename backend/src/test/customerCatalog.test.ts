// GET /api/v1/me/catalog — the merged Product-first customer catalog.
// Covers auth gating, active/deleted filtering, admin-field hygiene,
// availability math and Product-vs-legacy SKU deduplication.

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
import Settings from '../models/Settings.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';

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

async function approvedCustomer() {
    const company = await Company.create({ name: 'לקוח קטלוג', vatNumber: '544444444' });
    const customer = await User.create({
        name: 'לקוח קטלוג',
        email: 'catalog@example.com',
        password: 'CatalogPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return authCookieFor(customer);
}

interface CatalogResponseItem {
    sku: string;
    name?: string;
    price?: number;
    available?: number | null;
    isLegacy?: boolean;
}

function itemBySku(items: CatalogResponseItem[], sku: string) {
    return items.find((item) => item.sku === sku);
}

describe('GET /api/v1/me/catalog', () => {
    it('rejects unauthenticated requests and non-customer roles', async () => {
        const anonymous = await request(app).get('/api/v1/me/catalog');
        expect(anonymous.status).toBe(401);

        const admin = await createAdmin();
        const asAdmin = await request(app)
            .get('/api/v1/me/catalog')
            .set('Cookie', authCookieFor(admin));
        expect(asAdmin.status).toBe(403);
    });

    it('returns active products with customer-safe fields only', async () => {
        const cookie = await approvedCustomer();
        await Product.create({
            name: 'שמן קנולה 5 ליטר',
            sku: 'CAN-5L',
            price: 75,
            taxRate: 17,
            unit: 'box',
            currency: 'ILS',
            costPrice: 42,
            supplier: 'ספק סודי',
            stockTrackingEnabled: false,
            description: 'מיכל 5 ליטר',
        });

        const res = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);

        const item = res.body.data[0];
        expect(item).toMatchObject({
            sku: 'CAN-5L',
            name: 'שמן קנולה 5 ליטר',
            price: 75,
            taxRate: 17,
            unit: 'box',
            currency: 'ILS',
            stockTrackingEnabled: false,
            available: null,
            isLegacy: false,
        });
        expect(item.productId).toBeTruthy();
        // Admin-only fields must never leave the server for customers.
        expect(item).not.toHaveProperty('costPrice');
        expect(item).not.toHaveProperty('supplier');
        expect(item).not.toHaveProperty('supplierId');
        expect(item).not.toHaveProperty('createdBy');
        expect(item).not.toHaveProperty('syncStatus');
        expect(item).not.toHaveProperty('externalId');
    });

    it('excludes inactive and soft-deleted products', async () => {
        const cookie = await approvedCustomer();
        await Product.create({ name: 'פעיל', sku: 'ACTIVE-1', price: 10, stockTrackingEnabled: false });
        await Product.create({ name: 'כבוי', sku: 'INACTIVE-1', price: 10, isActive: false });
        await Product.create({ name: 'מחוק', sku: 'DELETED-1', price: 10, isDeleted: true, deletedAt: new Date() });

        const res = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body.data.map((i: { sku: string }) => i.sku)).toEqual(['ACTIVE-1']);
    });

    it('calculates availability from inventory, subtracting reservations and clamping at zero', async () => {
        const cookie = await approvedCustomer();
        const tracked = await Product.create({ name: 'במלאי', sku: 'STOCK-1', price: 20, stockTrackingEnabled: true });
        const overReserved = await Product.create({ name: 'בחוסר', sku: 'STOCK-2', price: 20, stockTrackingEnabled: true });
        const noRows = await Product.create({ name: 'ללא שורות', sku: 'STOCK-3', price: 20, stockTrackingEnabled: true });
        expect(noRows.stockTrackingEnabled).toBe(true);

        // Availability is MAIN-location only — the same location the order
        // reservation flow uses. The 'north' stock must NOT be shown to the
        // customer, because approving their order could never reserve it:
        // main contributes 10-3 = 7.
        await Inventory.create({ product: tracked._id, location: 'main', quantity: 10, reservedQuantity: 3 });
        await Inventory.create({ product: tracked._id, location: 'north', quantity: 5, reservedQuantity: 0 });
        // Over-reserved location clamps to 0 rather than going negative.
        await Inventory.create({ product: overReserved._id, location: 'main', quantity: 2, reservedQuantity: 7 });

        const res = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(itemBySku(res.body.data, 'STOCK-1')?.available).toBe(7);
        expect(itemBySku(res.body.data, 'STOCK-2')?.available).toBe(0);
        // Tracked product with no inventory rows yet → 0 available, still visible.
        expect(itemBySku(res.body.data, 'STOCK-3')?.available).toBe(0);
    });

    it('includes legacy box-price rows only when no Product exists for the SKU', async () => {
        const cookie = await approvedCustomer();
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [
                { label: 'פריט ישן', sku: 'LEGACY-1', pricePerUnit: 55, isActive: true },
                { label: 'פריט כבוי', sku: 'LEGACY-OFF', pricePerUnit: 55, isActive: false },
                { label: 'שם ישן', sku: 'BOTH-1', pricePerUnit: 40, isActive: true },
                { label: 'צל של מוצר כבוי', sku: 'shadow-1', pricePerUnit: 30, isActive: true },
            ],
        });
        await Product.create({ name: 'שם חדש', sku: 'BOTH-1', price: 45, taxRate: 17, stockTrackingEnabled: false });
        // Inactive Product shadows its legacy row (case-insensitively) — the
        // SKU must disappear from sale, not fall back to the old settings row.
        await Product.create({ name: 'מוצר כבוי', sku: 'SHADOW-1', price: 30, isActive: false });

        const res = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        expect(res.status).toBe(200);

        const skus = res.body.data.map((i: { sku: string }) => i.sku);
        expect(skus).toContain('LEGACY-1');
        expect(skus).not.toContain('LEGACY-OFF');
        expect(skus).not.toContain('shadow-1');
        expect(skus).not.toContain('SHADOW-1');

        // Duplicate SKU appears exactly once and the Product wins.
        expect(skus.filter((sku: string) => sku === 'BOTH-1')).toHaveLength(1);
        const both = itemBySku(res.body.data, 'BOTH-1');
        expect(both).toMatchObject({ name: 'שם חדש', price: 45, isLegacy: false });

        const legacy = itemBySku(res.body.data, 'LEGACY-1');
        expect(legacy).toMatchObject({
            name: 'פריט ישן',
            price: 55,
            isLegacy: true,
            stockTrackingEnabled: false,
            available: null,
        });
    });

    it('returns a deterministic order (name, then SKU)', async () => {
        const cookie = await approvedCustomer();
        await Product.create({ name: 'ב מוצר', sku: 'B-1', price: 10, stockTrackingEnabled: false });
        await Product.create({ name: 'א מוצר', sku: 'A-1', price: 10, stockTrackingEnabled: false });

        const first = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        const second = await request(app).get('/api/v1/me/catalog').set('Cookie', cookie);
        expect(first.body.data.map((i: { sku: string }) => i.sku)).toEqual(['A-1', 'B-1']);
        expect(second.body.data).toEqual(first.body.data);
    });
});
