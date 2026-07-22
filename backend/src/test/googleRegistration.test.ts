import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    VALID_REGISTRATION,
} from './testApp.js';
import { config } from '../config/index.js';
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

function ticketCookie(overrides: Record<string, unknown> = {}): string {
    const token = jwt.sign(
        {
            purpose: 'google_registration',
            googleId: 'google-sub-123',
            email: 'google.user@example.com',
            name: 'Google User',
            locale: 'he',
            ...overrides,
        },
        config.jwtSecret,
        { expiresIn: '30m' },
    );
    return `g_reg_ticket=${token}`;
}

const COMPLETION_BODY = {
    companyName: 'עסק מגוגל בעמ',
    phone: '054-7654321',
    country: 'IL',
    vatNumber: '514444444',
};

describe('Google registration completion', () => {
    it('exposes the verified Google identity to the completion page', async () => {
        const res = await request(app)
            .get('/api/auth/google/registration-context')
            .set('Cookie', ticketCookie());
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe('google.user@example.com');

        const noTicket = await request(app).get('/api/auth/google/registration-context');
        expect(noTicket.status).toBe(401);
    });

    it('creates the pending user only after business details are submitted', async () => {
        const res = await request(app)
            .post('/api/auth/google/complete-registration')
            .set('Cookie', ticketCookie())
            .send(COMPLETION_BODY);

        expect(res.status).toBe(202);
        expect(res.body.status).toBe('pending_approval');

        const user = await User.findOne({ email: 'google.user@example.com' });
        expect(user).not.toBeNull();
        expect(user!.registrationStatus).toBe('pending');
        expect(user!.registrationMethod).toBe('google');
        expect(user!.googleId).toBe('google-sub-123');
        expect(user!.isActive).toBe(false);
        expect(user!.company).toBeUndefined();
        expect(user!.registrationCompany?.name).toBe(COMPLETION_BODY.companyName);
        expect(await Company.countDocuments({})).toBe(0);
    });

    it('rejects an invalid or expired ticket', async () => {
        const noTicket = await request(app)
            .post('/api/auth/google/complete-registration')
            .send(COMPLETION_BODY);
        expect(noTicket.status).toBe(401);

        const expired = jwt.sign(
            { purpose: 'google_registration', googleId: 'x', email: 'a@b.c', name: 'x', locale: 'he' },
            config.jwtSecret,
            { expiresIn: '-1s' },
        );
        const expiredRes = await request(app)
            .post('/api/auth/google/complete-registration')
            .set('Cookie', `g_reg_ticket=${expired}`)
            .send(COMPLETION_BODY);
        expect(expiredRes.status).toBe(401);

        // A token with a different purpose (e.g. a real auth token) must not work.
        const wrongPurpose = jwt.sign(
            { id: 'someid', role: 'customer', tokenVersion: 0 },
            config.jwtSecret,
            { expiresIn: '30m' },
        );
        const wrongRes = await request(app)
            .post('/api/auth/google/complete-registration')
            .set('Cookie', `g_reg_ticket=${wrongPurpose}`)
            .send(COMPLETION_BODY);
        expect(wrongRes.status).toBe(401);
    });

    it('validates the business fields', async () => {
        const res = await request(app)
            .post('/api/auth/google/complete-registration')
            .set('Cookie', ticketCookie())
            .send({ ...COMPLETION_BODY, vatNumber: 'abc' });
        expect(res.status).toBe(400);
        expect(await User.countDocuments({})).toBe(0);
    });

    it('refuses when an account already exists for the email (no silent linking)', async () => {
        await request(app).post('/api/auth/register').send({
            ...VALID_REGISTRATION,
            email: 'google.user@example.com',
        });

        const res = await request(app)
            .post('/api/auth/google/complete-registration')
            .set('Cookie', ticketCookie())
            .send(COMPLETION_BODY);
        expect(res.status).toBe(409);
        // The existing password account was not touched.
        const user = await User.findOne({ email: 'google.user@example.com' });
        expect(user!.googleId).toBeUndefined();
        expect(user!.registrationMethod).toBe('password');
    });
});
