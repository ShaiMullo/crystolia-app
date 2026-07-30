// Demo-payment isolation: the demo payment page must never be treated as a
// real card provider — not offered to customers, not approvable, not
// savable, and reported as unconfigured in the admin payment status.

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
import Order from '../models/Order.js';
import {
    isDemoPaymentUrl,
    isCardPaymentConfigured,
    enabledPaymentMethods,
    paymentConfigError,
} from '../utils/paymentOptions.js';

const app = buildTestApp();

const DEMO_URL = 'https://business.crystolia.com/he/payment-demo';
const REAL_URL = 'https://pay.example.com/crystolia';

const BANK = {
    enabled: true,
    bankName: 'בנק לאומי',
    branch: '900',
    accountNumber: '12-345-678',
    accountName: 'Crystolia Ltd',
    iban: '',
};

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
    await Product.create({ name: 'שמן קנולה 5L', sku: 'DEMO-ISO-5L', price: 100, taxRate: 0, stockTrackingEnabled: false });
});

let counter = 0;
async function approvedCustomer() {
    counter += 1;
    const company = await Company.create({ name: `לקוח דמו ${counter}`, vatNumber: `58800000${counter}` });
    const customer = await User.create({
        name: 'לקוח דמו',
        email: `demo-iso-${counter}@example.com`,
        password: 'DemoIsoPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return { cookie: authCookieFor(customer), customer, company };
}

describe('isDemoPaymentUrl / method derivation', () => {
    it('detects demo payment URLs in any locale and rejects them as card config', () => {
        for (const url of [
            DEMO_URL,
            'https://business.crystolia.com/en/payment-demo',
            'https://business.crystolia.com/ru/payment-demo/',
            'https://anything.example.com/payment-demo',
            'https://business.crystolia.com/he/orders/abc123/pay',
        ]) {
            expect(isDemoPaymentUrl(url), url).toBe(true);
            expect(isCardPaymentConfigured({ bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: url } })).toBe(false);
        }
        expect(isDemoPaymentUrl(REAL_URL)).toBe(false);
        expect(isDemoPaymentUrl('')).toBe(false);
        expect(isDemoPaymentUrl(undefined)).toBe(false);
    });

    it('never offers the card method — a static link is not a verified provider', () => {
        const card = (paymentUrl: string) => ({ bankTransfer: BANK, creditCard: { enabled: true, paymentUrl } });
        // Even a syntactically perfect HTTPS link is NOT a payment method:
        // there is no verified provider integration, so no confirmation.
        expect(enabledPaymentMethods(card(REAL_URL))).toEqual(['bank_transfer']);
        expect(isCardPaymentConfigured(card(REAL_URL))).toBe(false);
        expect(enabledPaymentMethods(card(DEMO_URL))).toEqual(['bank_transfer']);
        expect(enabledPaymentMethods(card(''))).toEqual(['bank_transfer']);
        expect(enabledPaymentMethods(card('http://pay.example.com'))).toEqual(['bank_transfer']);
    });

    it('paymentConfigError blocks card approval: demo URL named explicitly, real URL blocked on missing provider', () => {
        const demoErr = paymentConfigError('credit_card', { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: DEMO_URL } });
        expect(demoErr).toMatch(/demo payment page/);
        const noProviderErr = paymentConfigError('credit_card', { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: REAL_URL } });
        expect(noProviderErr).toMatch(/No verified card payment provider/);
        expect(paymentConfigError('bank_transfer', { bankTransfer: BANK, creditCard: { enabled: false, paymentUrl: '' } })).toBeNull();
    });
});

describe('settings write guard', () => {
    it('rejects saving the demo page as the card provider URL', async () => {
        const admin = await createAdmin();
        const res = await request(app)
            .put('/api/v1/settings')
            .set('Cookie', authCookieFor(admin))
            .send({ paymentOptions: { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: DEMO_URL } } });
        expect(res.status).toBe(400);
        expect(res.body.error || res.body.message).toMatch(/demo payment page/i);
        expect(await Settings.countDocuments()).toBe(0);
    });

    it('accepts a real provider URL', async () => {
        const admin = await createAdmin();
        const res = await request(app)
            .put('/api/v1/settings')
            .set('Cookie', authCookieFor(admin))
            .send({ paymentOptions: { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: REAL_URL } } });
        expect(res.status).toBe(200);
        expect(res.body.data.paymentOptions.creditCard.paymentUrl).toBe(REAL_URL);
    });
});

describe('order flow with a demo card URL (fails closed)', () => {
    beforeEach(async () => {
        // The exact bad state production is in today: card "enabled" but
        // pointing at the demo page.
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [],
            paymentOptions: { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: DEMO_URL } },
        });
    });

    it('refuses a credit-card order preference (method not actually available)', async () => {
        const { cookie } = await approvedCustomer();
        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'DEMO-ISO-5L', quantity: 1 }], paymentPreference: 'credit_card' });
        expect(res.status).toBe(400);
        expect(await Order.countDocuments()).toBe(0);
    });

    it('still allows bank transfer', async () => {
        const { cookie } = await approvedCustomer();
        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send({ items: [{ sku: 'DEMO-ISO-5L', quantity: 1 }], paymentPreference: 'bank_transfer' });
        expect(res.status).toBe(201);
    });

    it('blocks approval of an existing card-preference order until settings are fixed', async () => {
        const { customer, company } = await approvedCustomer();
        const order = await Order.create({
            company: company._id,
            createdBy: customer._id,
            items: [{ productName: 'שמן קנולה 5L', quantity: 1, price: 100 }],
            totalAmount: 100,
            status: 'pending',
            paymentPreference: 'credit_card',
            timeline: [],
        });
        const admin = await createAdmin();
        const res = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(409);
        expect(res.body.error || res.body.message).toMatch(/demo payment page/i);
        expect((await Order.findById(order._id))?.status).toBe('pending');
    });
});

describe('admin payment-status endpoint', () => {
    it('reports the demo URL as unconfigured with explicit issues', async () => {
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [],
            paymentOptions: { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: DEMO_URL } },
        });
        const admin = await createAdmin();
        const res = await request(app).get('/api/v1/settings/payment-status').set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(200);
        const card = res.body.data.methods.find((m: { method: string }) => m.method === 'credit_card');
        expect(card.enabled).toBe(true);
        expect(card.configured).toBe(false);
        expect(card.provider).toBe('none');
        expect(card.staticLinkUsable).toBe(false);
        expect(card.issues.join(' ')).toMatch(/demo payment page/i);
        const bank = res.body.data.methods.find((m: { method: string }) => m.method === 'bank_transfer');
        expect(bank.configured).toBe(true);
    });

    it('never reports a static HTTPS link as a configured provider', async () => {
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [],
            paymentOptions: { bankTransfer: BANK, creditCard: { enabled: true, paymentUrl: REAL_URL } },
        });
        const admin = await createAdmin();
        const res = await request(app).get('/api/v1/settings/payment-status').set('Cookie', authCookieFor(admin));
        const card = res.body.data.methods.find((m: { method: string }) => m.method === 'credit_card');
        expect(card.configured).toBe(false);          // not end-to-end usable
        expect(card.provider).toBe('none');           // no verified integration
        expect(card.staticLinkUsable).toBe(true);     // transparency only
        expect(card.issues.join(' ')).toMatch(/No verified card provider/i);
    });

    it('is admin-only', async () => {
        const { cookie } = await approvedCustomer();
        const res = await request(app).get('/api/v1/settings/payment-status').set('Cookie', cookie);
        expect(res.status).toBe(403);
    });
});

describe('payment webhooks (no provider integrated)', () => {
    it('fails closed with 503 and never touches payment state', async () => {
        const res = await request(app).post('/api/payments/webhooks/someprovider').send({ event: 'paid' });
        expect(res.status).toBe(503);
        expect(res.body.error).toBe('PAYMENT_PROVIDER_NOT_CONFIGURED');
    });
});
