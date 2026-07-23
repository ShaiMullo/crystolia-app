import crypto from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, clearDb, startTestDb, stopTestDb } from './testApp.js';
import User from '../models/User.js';

const app = buildTestApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

async function createCustomer(email = 'customer@example.com') {
    return User.create({
        name: 'Test Customer',
        email,
        password: 'OldPassword1',
        role: 'customer',
        isActive: true,
        registrationStatus: 'approved',
        registrationMethod: 'password',
        preferredLocale: 'he',
    });
}

describe('password reset flow', () => {
    it('returns the same generic response for known and unknown emails', async () => {
        await createCustomer();

        const known = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'customer@example.com', locale: 'he' });
        const unknown = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'missing@example.com', locale: 'he' });

        expect(known.status).toBe(202);
        expect(unknown.status).toBe(202);
        expect(known.body).toEqual(unknown.body);

        const stored = await User.findOne({ email: 'customer@example.com' })
            .select('+passwordResetTokenHash +passwordResetExpiresAt');
        expect(stored?.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(stored?.passwordResetExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('accepts a valid one-time token, changes the password and invalidates reuse', async () => {
        const user = await createCustomer();
        const token = 'a-secure-one-time-token';
        user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        user.passwordResetExpiresAt = new Date(Date.now() + 60_000);
        await user.save({ validateBeforeSave: false });

        const reset = await request(app)
            .post('/api/auth/reset-password')
            .send({ token, password: 'NewPassword2' });
        expect(reset.status).toBe(200);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'NewPassword2' });
        expect(login.status).toBe(200);

        const reused = await request(app)
            .post('/api/auth/reset-password')
            .send({ token, password: 'AnotherPassword3' });
        expect(reused.status).toBe(400);
    });

    it('rejects expired tokens and weak passwords', async () => {
        const user = await createCustomer();
        const token = 'expired-token';
        user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        user.passwordResetExpiresAt = new Date(Date.now() - 1_000);
        await user.save({ validateBeforeSave: false });

        const expired = await request(app)
            .post('/api/auth/reset-password')
            .send({ token, password: 'NewPassword2' });
        expect(expired.status).toBe(400);

        const weak = await request(app)
            .post('/api/auth/reset-password')
            .send({ token: 'anything', password: 'weak' });
        expect(weak.status).toBe(400);
    });
});
