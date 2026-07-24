// ===============================================
// GET /api/auth/me — session validation endpoint
// (used by both frontends to bootstrap auth state)
// ===============================================

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

describe('GET /api/auth/me', () => {
    it('returns the current user for a valid auth cookie', async () => {
        const admin = await createAdmin();

        const res = await request(app)
            .get('/api/auth/me')
            .set('Cookie', authCookieFor(admin));

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe('admin@test.crystolia.com');
        expect(res.body.user.role).toBe('admin');
    });

    it('rejects requests without a cookie', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('rejects a cookie whose tokenVersion was invalidated', async () => {
        const admin = await createAdmin();
        const staleCookie = authCookieFor(admin);

        await User.findByIdAndUpdate(admin._id, { $inc: { tokenVersion: 1 } });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Cookie', staleCookie);
        expect(res.status).toBe(401);
    });

    it('rejects a cookie for a deactivated user', async () => {
        const admin = await createAdmin();
        const cookie = authCookieFor(admin);

        await User.findByIdAndUpdate(admin._id, { isActive: false });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie);
        expect(res.status).toBe(403);
    });
});
