// Customer payment-method preference: placement validation against the
// admin-enabled Settings.paymentOptions, the approval-time configuration
// guard, and the payment copy builders (email + SMS) that must expose ONLY
// the selected method.

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
import { buildOrderPaymentParagraphs } from '../services/emailService.js';
import { buildOrderStatusNotificationSms } from '../services/smsService.js';

const app = buildTestApp();

const BOTH_METHODS = {
    bankTransfer: {
        enabled: true,
        bankName: 'בנק לאומי',
        branch: '900',
        accountNumber: '12-345-678',
        accountName: 'Crystolia Ltd',
        iban: 'IL620108000000099999999',
    },
    creditCard: { enabled: true, paymentUrl: 'https://pay.example.com/crystolia' },
};

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
    await Product.create({ name: 'שמן חמניות 5L', sku: 'PAY-5L', price: 100, taxRate: 0, stockTrackingEnabled: false });
});

let counter = 0;
async function approvedCustomer() {
    counter += 1;
    const company = await Company.create({ name: `לקוח תשלום ${counter}`, vatNumber: `57700000${counter}` });
    const customer = await User.create({
        name: 'לקוח תשלום',
        email: `payment-${counter}@example.com`,
        password: 'PaymentPass1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
    return authCookieFor(customer);
}

function orderBody(paymentPreference?: unknown) {
    return { items: [{ sku: 'PAY-5L', quantity: 1 }], paymentPreference };
}

describe('payment preference at order placement', () => {
    it('stores a bank-transfer preference; credit card is not offerable without a verified provider', async () => {
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [], paymentOptions: BOTH_METHODS });
        const cookie = await approvedCustomer();

        const bank = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('bank_transfer'));
        expect(bank.status).toBe(201);
        expect(bank.body.data.paymentPreference).toBe('bank_transfer');

        // Card is admin-"enabled" with a valid HTTPS link, but no verified
        // provider integration exists — so it is not a selectable method.
        const card = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('credit_card'));
        expect(card.status).toBe(400);

        const stored = await Order.findById(bank.body.data._id).lean();
        expect(stored?.paymentPreference).toBe('bank_transfer');
    });

    it('rejects a missing, unknown, or arbitrary preference', async () => {
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [], paymentOptions: BOTH_METHODS });
        const cookie = await approvedCustomer();

        for (const bad of [undefined, '', 'cash', 'BANK_TRANSFER', 42, { evil: true }]) {
            const res = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody(bad));
            expect(res.status, `preference ${JSON.stringify(bad)}`).toBe(400);
        }
        expect(await Order.countDocuments()).toBe(0);
    });

    it('rejects a preference for a disabled method', async () => {
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [],
            paymentOptions: { ...BOTH_METHODS, creditCard: { enabled: false, paymentUrl: '' } },
        });
        const cookie = await approvedCustomer();

        const res = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('credit_card'));
        expect(res.status).toBe(400);
    });

    it('blocks ordering entirely while no payment method is enabled', async () => {
        await Settings.create({
            key: 'business',
            minimumOrderAmount: 0,
            currency: 'ILS',
            boxPrices: [],
            paymentOptions: { bankTransfer: { enabled: false }, creditCard: { enabled: false, paymentUrl: '' } },
        });
        const cookie = await approvedCustomer();

        const res = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('bank_transfer'));
        expect(res.status).toBe(400);
        expect(res.body.message || res.body.error).toContain('PAYMENT_METHODS_UNAVAILABLE');
    });

    it('keeps orders without a preference (pre-feature) readable', async () => {
        const cookie = await approvedCustomer();
        const customer = await User.findOne({ email: `payment-${counter}@example.com` });
        await Order.create({
            company: customer!.company,
            createdBy: customer!._id,
            items: [{ productName: 'הזמנה ישנה', quantity: 1, price: 50 }],
            totalAmount: 50,
            status: 'pending',
        });

        const res = await request(app).get('/api/v1/me/orders').set('Cookie', cookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].paymentPreference).toBeUndefined();
    });
});

// Legacy credit-card orders (placed before the verified-provider gate)
// exist in the DB; they are created directly here to test approval guards.
async function legacyCardOrder() {
    const customer = await User.findOne({ email: `payment-${counter}@example.com` });
    return Order.create({
        company: customer!.company,
        createdBy: customer!._id,
        items: [{ productName: 'שמן חמניות 5L', quantity: 1, price: 100 }],
        totalAmount: 100,
        status: 'pending',
        paymentPreference: 'credit_card',
    });
}

describe('payment configuration guard at approval', () => {
    it('refuses to approve a credit-card order while no verified provider is integrated', async () => {
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [], paymentOptions: BOTH_METHODS });
        await approvedCustomer();
        const order = await legacyCardOrder();

        const admin = await createAdmin();
        const blocked = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(blocked.status).toBe(409);
        expect(blocked.body.message || blocked.body.error).toContain('Cannot approve');
        expect(blocked.body.message || blocked.body.error).toMatch(/No verified card payment provider/);
        expect((await Order.findById(order._id).lean())?.status).toBe('pending');
    });

    it('also refuses when the credit-card method is disabled or its URL is not HTTPS', async () => {
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [], paymentOptions: BOTH_METHODS });
        await approvedCustomer();
        const order = await legacyCardOrder();
        const admin = await createAdmin();

        await Settings.updateOne({ key: 'business' }, { $set: { 'paymentOptions.creditCard.enabled': false } });
        const disabled = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(disabled.status).toBe(409);

        await Settings.updateOne({ key: 'business' }, {
            $set: {
                'paymentOptions.creditCard.enabled': true,
                'paymentOptions.creditCard.paymentUrl': 'http://insecure.example.com',
            },
        });
        const insecure = await request(app)
            .patch(`/api/orders/${order._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(insecure.status).toBe(409);
    });

    it('refuses bank-transfer approval when any required bank detail is missing', async () => {
        await Settings.create({ key: 'business', minimumOrderAmount: 0, currency: 'ILS', boxPrices: [], paymentOptions: BOTH_METHODS });
        const cookie = await approvedCustomer();
        const placed = await request(app).post('/api/v1/me/orders').set('Cookie', cookie).send(orderBody('bank_transfer'));
        expect(placed.status).toBe(201);

        await Settings.updateOne(
            { key: 'business' },
            { $set: { 'paymentOptions.bankTransfer.branch': '', 'paymentOptions.bankTransfer.accountName': '' } },
        );

        const admin = await createAdmin();
        const blocked = await request(app)
            .patch(`/api/orders/${placed.body.data._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(blocked.status).toBe(409);
        expect((await Order.findById(placed.body.data._id).lean())?.status).toBe('pending');
    });

    it('still approves legacy orders that carry no preference', async () => {
        await approvedCustomer();
        const customer = await User.findOne({ email: `payment-${counter}@example.com` });
        const legacy = await Order.create({
            company: customer!.company,
            createdBy: customer!._id,
            items: [{ productName: 'הזמנה ישנה', quantity: 1, price: 50 }],
            totalAmount: 50,
            status: 'pending',
        });

        const admin = await createAdmin();
        const res = await request(app)
            .patch(`/api/orders/${legacy._id}`)
            .set('Cookie', authCookieFor(admin))
            .send({ status: 'approved' });
        expect(res.status).toBe(200);
    });
});

describe('payment copy builders expose only the selected method', () => {
    it('bank-transfer email paragraphs contain the bank details and never a payment URL', async () => {
        const paragraphs = buildOrderPaymentParagraphs(
            { method: 'bank_transfer', bank: BOTH_METHODS.bankTransfer },
            'he',
            'ABC12345',
        );
        const text = paragraphs.join('\n');
        expect(text).toContain('העברה בנקאית');
        expect(text).toContain('בנק לאומי');
        expect(text).toContain('12-345-678');
        expect(text).toContain('IL620108000000099999999');
        expect(text).toContain('#ABC12345');
        expect(text).not.toContain('https://');
        expect(text).not.toContain('אשראי');
    });

    it('credit-card email paragraphs contain the HTTPS link and never bank details', async () => {
        for (const locale of ['he', 'en', 'ru'] as const) {
            const text = buildOrderPaymentParagraphs(
                { method: 'credit_card', paymentUrl: BOTH_METHODS.creditCard.paymentUrl },
                locale,
                'ABC12345',
            ).join('\n');
            expect(text).toContain('https://pay.example.com/crystolia');
            expect(text).toContain('#ABC12345');
            expect(text).not.toContain('12-345-678');
            expect(text).not.toContain('בנק לאומי');
        }
    });

    it('approved SMS names the method but never carries account details', async () => {
        const sms = buildOrderStatusNotificationSms({
            customerName: 'ישראל',
            orderId: 'ABC12345',
            statusLabel: 'אושרה',
            status: 'approved',
            totalAmount: 100,
            dashboardUrl: 'https://business.crystolia.com/he/dashboard',
            paymentMethodLabel: 'העברה בנקאית',
        });
        expect(sms).toContain('אמצעי התשלום שנבחר: העברה בנקאית');
        expect(sms).toContain('https://business.crystolia.com/he/dashboard');
        expect(sms).not.toContain('12-345-678');
        expect(sms).not.toContain('IBAN');
    });
});
