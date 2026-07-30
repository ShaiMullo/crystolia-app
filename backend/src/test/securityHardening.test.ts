// Production-baseline security hardening: failed logins leave an audit
// trail, and soft-deleting a user invalidates their live sessions.

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
import AuditLog from '../models/AuditLog.js';

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

describe('failed-login auditing', () => {
    it('writes a warning audit entry on a wrong password, without password material', async () => {
        await createAdmin({ email: 'audit-login@test.crystolia.com' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'audit-login@test.crystolia.com', password: 'WrongPass1' });
        expect(res.status).toBe(401);

        const entry = await AuditLog.findOne({ action: 'LOGIN_FAILED' }).lean();
        expect(entry).toBeTruthy();
        expect(entry?.severity).toBe('warning');
        expect(entry?.details?.email).toBe('audit-login@test.crystolia.com');
        expect(JSON.stringify(entry?.details)).not.toContain('WrongPass1');
    });

    it('also audits attempts against nonexistent accounts', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@test.crystolia.com', password: 'Whatever1' });
        expect(res.status).toBe(401);

        const entry = await AuditLog.findOne({ action: 'LOGIN_FAILED' }).lean();
        expect(entry?.entityId).toBe('unknown');
    });
});

describe('soft-delete session invalidation', () => {
    it('bumps tokenVersion so an existing cookie stops working immediately', async () => {
        const admin = await createAdmin();
        const victim = await User.create({
            name: 'משתמש למחיקה',
            email: 'soft-delete-victim@test.crystolia.com',
            password: 'VictimPass1',
            role: 'customer',
            isActive: true,
            registrationStatus: 'approved',
        });
        const victimCookie = authCookieFor(victim); // minted with tokenVersion 0

        const del = await request(app)
            .delete(`/api/users/${victim._id}`)
            .set('Cookie', authCookieFor(admin));
        expect(del.status).toBe(200);

        const stored = await User.findById(victim._id).lean();
        expect(stored?.isDeleted).toBe(true);
        expect(stored?.tokenVersion).toBe(1);

        // The old cookie must be rejected. Today the isActive guard answers
        // first (403); the tokenVersion bump (401) is defense-in-depth for
        // any future path that reactivates the account.
        const me = await request(app).get('/api/v1/me/profile').set('Cookie', victimCookie);
        expect([401, 403]).toContain(me.status);
    });
});
