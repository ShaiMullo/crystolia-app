import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    VALID_REGISTRATION,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

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

describe('POST /api/auth/register (password registration)', () => {
    it('creates a pending user with a company snapshot and no Company document', async () => {
        const res = await request(app).post('/api/auth/register').send(VALID_REGISTRATION);

        expect(res.status).toBe(202);
        expect(res.body.status).toBe('pending_approval');
        expect(res.headers['set-cookie']).toBeUndefined(); // never a session before approval

        const user = await User.findOne({ email: VALID_REGISTRATION.email }).select('+password');
        expect(user).not.toBeNull();
        expect(user!.role).toBe('customer');
        expect(user!.isActive).toBe(false);
        expect(user!.registrationStatus).toBe('pending');
        expect(user!.registrationMethod).toBe('password');
        expect(user!.company).toBeUndefined();
        expect(user!.registrationCompany).toMatchObject({
            name: VALID_REGISTRATION.companyName,
            vatNumber: VALID_REGISTRATION.vatNumber,
            country: 'IL',
        });
        // No Company is created until an admin approves.
        expect(await Company.countDocuments({})).toBe(0);
        // Providers are unconfigured in tests → outcomes recorded as skipped,
        // and the registration still succeeded (best-effort contract).
        expect(user!.registrationNotifications?.pendingEmailStatus).toBe('skipped');
        expect(user!.registrationNotifications?.adminSmsStatus).toBe('skipped');
    });

    it.each([
        ['name', ''],
        ['companyName', ''],
        ['phone', ''],
        ['country', ''],
        ['vatNumber', ''],
        ['email', ''],
        ['password', ''],
    ])('rejects a registration missing %s', async (field, value) => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_REGISTRATION, [field]: value });
        expect(res.status).toBe(400);
        expect(await User.countDocuments({})).toBe(0);
    });

    it('rejects an invalid Israeli company number and an unknown country', async () => {
        const badVat = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_REGISTRATION, vatNumber: '12ab' });
        expect(badVat.status).toBe(400);

        const badCountry = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_REGISTRATION, country: 'XX' });
        expect(badCountry.status).toBe(400);
    });

    it('rejects a weak password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_REGISTRATION, password: 'alllowercase' });
        expect(res.status).toBe(400);
    });

    it('answers an already-registered email with the same generic 202 (no enumeration)', async () => {
        await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...VALID_REGISTRATION, name: 'Someone Else', vatNumber: '512345678' });

        expect(res.status).toBe(202);
        expect(res.body.status).toBe('pending_approval');
        // No second user was created.
        expect(await User.countDocuments({ email: VALID_REGISTRATION.email })).toBe(1);
    });

    it('never joins an existing company by name, and flags duplicate VAT for manual review', async () => {
        const company = await Company.create({ name: 'חברה קיימת', vatNumber: '599999999' });

        const res = await request(app).post('/api/auth/register').send({
            ...VALID_REGISTRATION,
            companyName: 'חברה קיימת',
            vatNumber: '599999999',
        });
        expect(res.status).toBe(202);

        const user = await User.findOne({ email: VALID_REGISTRATION.email });
        expect(user!.company).toBeUndefined(); // NOT attached to the existing company
        expect(user!.registrationFlags).toEqual(
            expect.arrayContaining(['possible-duplicate-vat', 'possible-duplicate-name']),
        );
        expect(String(company._id)).toBeTruthy();
    });
});

describe('POST /api/auth/login gating', () => {
    it('blocks a pending user with 403 and an approved+active user signs in', async () => {
        await request(app).post('/api/auth/register').send(VALID_REGISTRATION);

        const pendingLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password });
        expect(pendingLogin.status).toBe(403);
        expect(pendingLogin.body.error).toBe('Account is awaiting approval');

        await User.updateOne(
            { email: VALID_REGISTRATION.email },
            { $set: { registrationStatus: 'approved', isActive: true } },
        );
        const okLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password });
        expect(okLogin.status).toBe(200);
        expect(okLogin.headers['set-cookie']?.[0]).toContain('auth_token=');
    });

    it('blocks a rejected user with a generic 401', async () => {
        await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
        await User.updateOne(
            { email: VALID_REGISTRATION.email },
            { $set: { registrationStatus: 'rejected' } },
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Incorrect email or password'); // reveals nothing
    });

    it('gives a pending user no access to customer orders', async () => {
        await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
        // Even a forged/stale cookie is useless: protect rejects inactive users.
        const user = await User.findOne({ email: VALID_REGISTRATION.email });
        const { authCookieFor } = await import('./testApp.js');
        const res = await request(app)
            .get('/api/v1/me/orders')
            .set('Cookie', authCookieFor(user!));
        expect(res.status).toBe(403);
    });
});
