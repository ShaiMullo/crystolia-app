// ===============================================
// Invoice routes — company scoping + issue guarantees
// ===============================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
    startTestDb,
    stopTestDb,
    clearDb,
    createAdmin,
    authCookieFor,
} from './testApp.js';
import invoicesRouter from '../routes/invoices.js';
import { errorHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Invoice from '../models/Invoice.js';

function buildInvoiceApp(): Express {
    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/invoices', invoicesRouter);
    app.use(errorHandler);
    return app;
}

const app = buildInvoiceApp();

async function customerFor(company: { _id: unknown }, email: string) {
    return User.create({
        name: 'לקוח בדיקה',
        email,
        password: 'Customer1',
        role: 'customer',
        company: company._id,
        isActive: true,
        registrationStatus: 'approved',
    });
}

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

describe('GET /api/invoices — company scoping', () => {
    it('returns only the customer own-company invoices, including status and pdfUrl', async () => {
        const companyA = await Company.create({ name: 'חברה א', vatNumber: '511111111' });
        const companyB = await Company.create({ name: 'חברה ב', vatNumber: '522222222' });
        const customer = await customerFor(companyA, 'customer.a@example.com');

        await Invoice.create({
            company: companyA._id,
            invoiceNumber: 'INV-A-1',
            totalAmount: 100,
            status: 'issued',
            pdfUrl: 'https://example.com/inv-a-1.pdf',
        });
        await Invoice.create({
            company: companyA._id,
            invoiceNumber: 'INV-A-2',
            totalAmount: 200,
            status: 'draft',
        });
        await Invoice.create({
            company: companyB._id,
            invoiceNumber: 'INV-B-1',
            totalAmount: 999,
            status: 'issued',
            pdfUrl: 'https://example.com/inv-b-1.pdf',
        });

        const res = await request(app)
            .get('/api/invoices')
            .set('Cookie', authCookieFor(customer));

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        const numbers = res.body.data.map((inv: { invoiceNumber: string }) => inv.invoiceNumber);
        expect(numbers).toContain('INV-A-1');
        expect(numbers).toContain('INV-A-2');
        expect(numbers).not.toContain('INV-B-1');

        const issued = res.body.data.find((inv: { invoiceNumber: string }) => inv.invoiceNumber === 'INV-A-1');
        expect(issued.status).toBe('issued');
        expect(issued.pdfUrl).toBe('https://example.com/inv-a-1.pdf');
        const draft = res.body.data.find((inv: { invoiceNumber: string }) => inv.invoiceNumber === 'INV-A-2');
        expect(draft.status).toBe('draft');
        expect(draft.pdfUrl).toBeUndefined();
    });

    it('rejects a customer without a linked company', async () => {
        const orphan = await User.create({
            name: 'ללא חברה',
            email: 'orphan@example.com',
            password: 'Customer1',
            role: 'customer',
            isActive: true,
            registrationStatus: 'approved',
        });

        const res = await request(app)
            .get('/api/invoices')
            .set('Cookie', authCookieFor(orphan));
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app).get('/api/invoices');
        expect(res.status).toBe(401);
    });

    it('lets an admin list all invoices and filter by company', async () => {
        const companyA = await Company.create({ name: 'חברה א', vatNumber: '511111111' });
        const companyB = await Company.create({ name: 'חברה ב', vatNumber: '522222222' });
        const admin = await createAdmin();

        await Invoice.create({ company: companyA._id, invoiceNumber: 'INV-A-1', totalAmount: 100 });
        await Invoice.create({ company: companyB._id, invoiceNumber: 'INV-B-1', totalAmount: 200 });

        const all = await request(app)
            .get('/api/invoices')
            .set('Cookie', authCookieFor(admin));
        expect(all.status).toBe(200);
        expect(all.body.count).toBe(2);

        const filtered = await request(app)
            .get(`/api/invoices?companyId=${companyB._id}`)
            .set('Cookie', authCookieFor(admin));
        expect(filtered.status).toBe(200);
        expect(filtered.body.count).toBe(1);
        expect(filtered.body.data[0].invoiceNumber).toBe('INV-B-1');
    });
});

describe('invoice mutations — role guard + issue guarantees', () => {
    it('forbids customers from creating invoices', async () => {
        const company = await Company.create({ name: 'חברה א', vatNumber: '511111111' });
        const customer = await customerFor(company, 'customer.a@example.com');

        const res = await request(app)
            .post('/api/invoices')
            .set('Cookie', authCookieFor(customer))
            .send({ company: company._id, invoiceNumber: 'INV-X', totalAmount: 50 });
        expect(res.status).toBe(403);
    });

    it('refuses to issue an invoice that is not a draft', async () => {
        const company = await Company.create({ name: 'חברה א', vatNumber: '511111111' });
        const admin = await createAdmin();
        const invoice = await Invoice.create({
            company: company._id,
            invoiceNumber: 'INV-ISSUED',
            totalAmount: 100,
            status: 'issued',
        });

        const res = await request(app)
            .post(`/api/invoices/${invoice._id}/issue`)
            .set('Cookie', authCookieFor(admin));
        expect(res.status).toBe(400);
    });

    it('leaves a draft untouched (no fake pdfUrl) when the invoice provider is not configured', async () => {
        const company = await Company.create({ name: 'חברה א', vatNumber: '511111111' });
        const admin = await createAdmin();
        const invoice = await Invoice.create({
            company: company._id,
            invoiceNumber: 'INV-DRAFT',
            totalAmount: 100,
            status: 'draft',
        });

        const res = await request(app)
            .post(`/api/invoices/${invoice._id}/issue`)
            .set('Cookie', authCookieFor(admin));
        expect(res.status).toBeGreaterThanOrEqual(500);

        const after = await Invoice.findById(invoice._id);
        expect(after!.status).toBe('draft');
        expect(after!.pdfUrl).toBeUndefined();
        expect(after!.greenInvoiceDocId).toBeUndefined();
    });
});
