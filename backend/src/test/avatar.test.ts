import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    authCookieFor,
    buildTestApp,
    clearDb,
    startTestDb,
    stopTestDb,
} from './testApp.js';
import User from '../models/User.js';
import {
    MAX_AVATAR_BYTES,
    normalizeGoogleAvatarUrl,
    normalizeUploadedAvatar,
} from '../utils/avatar.js';

const app = buildTestApp();
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const VALID_PNG = `data:image/png;base64,${PNG_HEADER.toString('base64')}`;

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

describe('avatar validation', () => {
    it('accepts supported raster data with a matching binary signature', () => {
        expect(normalizeUploadedAvatar(VALID_PNG)).toBe(VALID_PNG);
    });

    it('rejects unsafe formats, mismatched signatures and oversized data', () => {
        expect(normalizeUploadedAvatar('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
        expect(normalizeUploadedAvatar('data:image/png;base64,SGVsbG8=')).toBeNull();
        const oversized = Buffer.concat([PNG_HEADER, Buffer.alloc(MAX_AVATAR_BYTES)]);
        expect(normalizeUploadedAvatar(`data:image/png;base64,${oversized.toString('base64')}`)).toBeNull();
    });

    it('only accepts HTTPS Google-hosted profile URLs', () => {
        expect(normalizeGoogleAvatarUrl('https://lh3.googleusercontent.com/a/photo')).toBe(
            'https://lh3.googleusercontent.com/a/photo',
        );
        expect(normalizeGoogleAvatarUrl('http://lh3.googleusercontent.com/a/photo')).toBeUndefined();
        expect(normalizeGoogleAvatarUrl('https://example.com/photo')).toBeUndefined();
    });
});

describe('PATCH /api/v1/me/avatar', () => {
    it('persists an avatar for the authenticated customer', async () => {
        const customer = await User.create({
            name: 'Avatar Customer',
            email: 'avatar.customer@example.com',
            password: 'Customer1',
            role: 'customer',
            isActive: true,
            registrationStatus: 'approved',
        });

        const res = await request(app)
            .patch('/api/v1/me/avatar')
            .set('Cookie', authCookieFor(customer))
            .send({ avatar: VALID_PNG });

        expect(res.status).toBe(200);
        expect(res.body.data.avatar).toBe(VALID_PNG);
        expect((await User.findById(customer._id))?.avatar).toBe(VALID_PNG);
    });

    it('rejects invalid image payloads without changing the user', async () => {
        const customer = await User.create({
            name: 'Avatar Customer',
            email: 'avatar.invalid@example.com',
            password: 'Customer1',
            role: 'customer',
            isActive: true,
            registrationStatus: 'approved',
        });

        const res = await request(app)
            .patch('/api/v1/me/avatar')
            .set('Cookie', authCookieFor(customer))
            .send({ avatar: 'data:image/png;base64,SGVsbG8=' });

        expect(res.status).toBe(400);
        expect((await User.findById(customer._id))?.avatar).toBeUndefined();
    });

    it('requires authentication', async () => {
        const res = await request(app)
            .patch('/api/v1/me/avatar')
            .send({ avatar: VALID_PNG });
        expect(res.status).toBe(401);
    });
});
