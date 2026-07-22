// Flow tests with a CONFIGURED (mocked) Twilio provider. All app modules are
// imported DYNAMICALLY after the Twilio env vars are set — config/index.ts
// reads the environment once at import time, so a static import would freeze
// the unconfigured state.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('axios', () => {
    const post = vi.fn().mockResolvedValue({ data: { sid: 'SM123' } });
    return { default: { post, isAxiosError: () => false }, post };
});

describe('registration flow with configured SMS provider (mocked Twilio)', () => {
    let harness: typeof import('./testApp.js');
    let axiosMock: { post: ReturnType<typeof vi.fn> };
    let request: typeof import('supertest');
    let UserModel: (typeof import('../models/User.js'))['User'];

    beforeAll(async () => {
        process.env.TWILIO_ACCOUNT_SID = 'ACtest';
        process.env.TWILIO_AUTH_TOKEN = 'token';
        process.env.TWILIO_PHONE_NUMBER = '+15550000000';
        process.env.ADMIN_PHONE_NUMBER = '+972500000000';

        harness = await import('./testApp.js');
        axiosMock = (await import('axios')).default as unknown as { post: ReturnType<typeof vi.fn> };
        request = (await import('supertest')).default as unknown as typeof import('supertest');
        UserModel = (await import('../models/User.js')).User;
        await harness.startTestDb();
    });

    afterAll(async () => {
        await harness.stopTestDb();
    });

    beforeEach(async () => {
        await harness.clearDb();
        axiosMock.post.mockClear();
        axiosMock.post.mockResolvedValue({ data: { sid: 'SM123' } });
    });

    it('sends the admin SMS only after the registration is saved', async () => {
        const app = harness.buildTestApp();
        const res = await request(app).post('/api/auth/register').send(harness.VALID_REGISTRATION);
        expect(res.status).toBe(202);

        const twilioCalls = axiosMock.post.mock.calls.filter(([url]) =>
            String(url).includes('api.twilio.com'),
        );
        expect(twilioCalls).toHaveLength(1);
        const body = String(twilioCalls[0][1]);
        expect(decodeURIComponent(body.replace(/\+/g, ' '))).toContain('בקשת הרשמה חדשה');

        const user = await UserModel.findOne({ email: harness.VALID_REGISTRATION.email });
        expect(user!.registrationNotifications?.adminSmsStatus).toBe('sent');
        // The SMS deep-link targets the admin registrations screen for this user.
        expect(decodeURIComponent(body)).toContain(`/admin/registrations/${user!._id}`);
    });

    it('does not send any SMS for an invalid registration', async () => {
        const app = harness.buildTestApp();
        const res = await request(app)
            .post('/api/auth/register')
            .send({ ...harness.VALID_REGISTRATION, vatNumber: '' });
        expect(res.status).toBe(400);
        const twilioCalls = axiosMock.post.mock.calls.filter(([url]) =>
            String(url).includes('api.twilio.com'),
        );
        expect(twilioCalls).toHaveLength(0);
    });

    it('keeps the registration when Twilio is down', async () => {
        axiosMock.post.mockRejectedValue(new Error('twilio down'));

        const app = harness.buildTestApp();
        const res = await request(app).post('/api/auth/register').send(harness.VALID_REGISTRATION);
        expect(res.status).toBe(202); // best-effort: registration survives

        const user = await UserModel.findOne({ email: harness.VALID_REGISTRATION.email });
        expect(user).not.toBeNull();
        expect(user!.registrationStatus).toBe('pending');
        expect(user!.registrationNotifications?.adminSmsStatus).toBe('failed');
    });
});
