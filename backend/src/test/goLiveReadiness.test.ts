// Go-Live readiness endpoint: admin-only, secret-free, and its stock
// calculations must match what order approval will actually enforce.

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
import { config as configRef } from '../config/index.js';

const app = buildTestApp();

const SECRET_ACCOUNT_NUMBER = '9483-7261-5555';
const SECRET_IBAN = 'IL620108000000099999999';

beforeAll(async () => {
    // Replica set so the transactions check reports ready (mirrors prod).
    await startTestDb({ replSet: true });
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
        paymentOptions: {
            bankTransfer: {
                enabled: true,
                bankName: 'בנק בדיקה',
                branch: '123',
                accountNumber: SECRET_ACCOUNT_NUMBER,
                accountName: 'Crystolia Ltd',
                iban: SECRET_IBAN,
            },
            creditCard: { enabled: true, paymentUrl: 'https://pay.example.com/x' },
        },
    });
});

describe('GET /api/v1/system/go-live', () => {
    it('is admin-only', async () => {
        const company = await Company.create({ name: 'לקוח מוכנות', vatNumber: '511234567' });
        const customer = await User.create({
            name: 'לקוח',
            email: 'golive-customer@example.com',
            password: 'GoLivePass1',
            role: 'customer',
            company: company._id,
            isActive: true,
            registrationStatus: 'approved',
        });
        expect((await request(app).get('/api/v1/system/go-live')).status).toBe(401);
        expect((await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(customer))).status).toBe(403);
    });

    it('never exposes bank account values or credentials', async () => {
        const admin = await createAdmin();
        const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(200);
        const raw = JSON.stringify(res.body);
        expect(raw).not.toContain(SECRET_ACCOUNT_NUMBER);
        expect(raw).not.toContain(SECRET_IBAN);
        expect(raw).not.toContain('בנק בדיקה');
        expect(raw).not.toContain('mongodb');
    });

    it('reports platform readiness and honest payment semantics', async () => {
        const admin = await createAdmin();
        const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
        expect(res.body.data.database.transactionsReady).toBe(true);
        expect(res.body.data.database.topology).toBe('replica_set');
        expect(res.body.data.criticalIndexes.invoiceOrderUnique.ready).toBe(true);

        const card = res.body.data.payments.methods.find((m: { method: string }) => m.method === 'credit_card');
        expect(card.configured).toBe(false); // never "configured" without a verified provider
        const bank = res.body.data.payments.methods.find((m: { method: string }) => m.method === 'bank_transfer');
        expect(bank.configured).toBe(true);
        // Non-empty bank fields are NOT verification — the owner must confirm.
        expect(res.body.data.payments.bankVerification).toBe('owner_confirmation_required');
    });

    it('integration states are structured and never claim verification from config presence', async () => {
        const admin = await createAdmin();
        const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
        const integrations = res.body.data.integrations;
        // Test env: everything unconfigured (setup.ts strips provider env).
        for (const key of ['email', 'smsTransport', 'adminSmsRecipient', 'googleOauth', 'greenInvoice', 'errorTracking', 'uptimeAlerts']) {
            expect(integrations[key], key).toBe('not_configured');
        }
        // Config presence may only ever yield *_unverified — never 'verified'.
        expect(Object.values(integrations)).not.toContain('verified');
        // External workflows are manual-check items, not claimed successes.
        expect(res.body.data.operations.backups.status).toBe('external_manual_check_required');
        expect(res.body.data.operations.uptimeMonitor.status).toBe('external_manual_check_required');
    });

    it('customer SMS readiness depends on the TRANSPORT, not the admin recipient', async () => {
        const admin = await createAdmin();
        const originalSms = { ...configRef.sms };
        const originalAdminPhone = configRef.adminPhone;
        try {
            // Transport fully configured, but NO admin phone: customer SMS
            // must show configured while the admin recipient shows missing.
            configRef.sms.accountSid = 'ACtest';
            configRef.sms.authToken = 'token';
            configRef.sms.fromNumber = '+15550001111';
            configRef.adminPhone = '';
            const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
            expect(res.body.data.integrations.smsTransport).toBe('configured_unverified');
            expect(res.body.data.integrations.adminSmsRecipient).toBe('not_configured');
            const raw = JSON.stringify(res.body);
            expect(raw).not.toContain('ACtest');
            expect(raw).not.toContain('+15550001111');
        } finally {
            Object.assign(configRef.sms, originalSms);
            configRef.adminPhone = originalAdminPhone;
        }
    });

    it('Green Invoice sandbox mode is visible as sandbox, never production-ready', async () => {
        const admin = await createAdmin();
        const original = { ...configRef.greenInvoice };
        try {
            configRef.greenInvoice.apiId = 'gi-test-id';
            configRef.greenInvoice.secret = 'gi-test-secret';
            configRef.greenInvoice.sandbox = true;
            const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
            expect(res.body.data.integrations.greenInvoice).toBe('configured_sandbox_unverified');
            // Credentials that were injected must not leak into the response.
            const raw = JSON.stringify(res.body);
            expect(raw).not.toContain('gi-test-id');
            expect(raw).not.toContain('gi-test-secret');
        } finally {
            Object.assign(configRef.greenInvoice, original);
        }
    });

    it('computes stock readiness exactly as approval will enforce it', async () => {
        const admin = await createAdmin();
        const ready = await Product.create({ name: 'מוכן', sku: 'GL-READY', price: 10, stockTrackingEnabled: true });
        await Inventory.create({ product: ready._id, location: 'main', quantity: 10, reservedQuantity: 2 });
        const zero = await Product.create({ name: 'אפס', sku: 'GL-ZERO', price: 10, stockTrackingEnabled: true });
        await Inventory.create({ product: zero._id, location: 'main', quantity: 3, reservedQuantity: 3 });
        const noRow = await Product.create({ name: 'בלי שורה', sku: 'GL-NOROW', price: 10, stockTrackingEnabled: true });
        expect(noRow.stockTrackingEnabled).toBe(true);
        // Untracked and other-location stock must not count.
        await Product.create({ name: 'לא במעקב', sku: 'GL-UNTRACKED', price: 10, stockTrackingEnabled: false });
        const other = await Product.create({ name: 'מחסן אחר', sku: 'GL-OTHER', price: 10, stockTrackingEnabled: true });
        await Inventory.create({ product: other._id, location: 'north', quantity: 50, reservedQuantity: 0 });

        const res = await request(app).get('/api/v1/system/go-live').set('Cookie', authCookieFor(admin));
        const stock = res.body.data.stock;
        expect(stock.activeProducts).toBe(5);
        expect(stock.trackedProducts).toBe(4);
        expect(stock.readyProducts).toBe(1); // only GL-READY (8 available)
        expect(stock.ready).toBe(false);

        const bySku = Object.fromEntries(stock.notReady.map((i: { sku: string; status: string }) => [i.sku, i.status]));
        expect(bySku['GL-ZERO']).toBe('ZERO_AVAILABLE');
        expect(bySku['GL-NOROW']).toBe('NO_INVENTORY_ROW');
        expect(bySku['GL-OTHER']).toBe('NO_INVENTORY_ROW'); // north stock is unusable for main-location approval
        expect(bySku['GL-UNTRACKED']).toBeUndefined();
    });
});
