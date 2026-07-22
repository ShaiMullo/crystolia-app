import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
    buildTestApp,
    startTestDb,
    stopTestDb,
    clearDb,
    createAdmin,
    authCookieFor,
    VALID_REGISTRATION,
} from './testApp.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

const app = buildTestApp();

const ORDER_BODY = { items: [{ productName: 'שמן חמניות 5 ליטר', quantity: 2, price: 60 }] };

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
});

async function approvedFlowUser() {
    await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
    const admin = await createAdmin();
    const user = await User.findOne({ email: VALID_REGISTRATION.email });
    await request(app)
        .post(`/api/v1/users/${user!._id}/approve-registration`)
        .set('Cookie', authCookieFor(admin));
    const approved = await User.findById(user!._id);
    return { user: approved!, cookie: authCookieFor(approved!) };
}

describe('order gating for approval-flow users', () => {
    it('blocks ordering until delivery/invoice details are completed, then allows it', async () => {
        const { cookie } = await approvedFlowUser();

        const blocked = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send(ORDER_BODY);
        expect(blocked.status).toBe(403);
        expect(blocked.body.error).toBe('ORDER_PROFILE_INCOMPLETE');

        const completion = await request(app)
            .patch('/api/v1/me/profile')
            .set('Cookie', cookie)
            .send({
                address: 'הרצל 10',
                city: 'תל אביב',
                billingAddress: 'הרצל 10, תל אביב',
                billingEmail: 'billing@example.com',
                contactRole: 'מנהל רכש',
            });
        expect(completion.status).toBe(200);

        const allowed = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', cookie)
            .send(ORDER_BODY);
        expect(allowed.status).toBe(201);
        expect(allowed.body.data.totalAmount).toBeGreaterThan(0);
    });

    it('rejects an invalid invoice email during profile completion', async () => {
        const { cookie } = await approvedFlowUser();
        const res = await request(app)
            .patch('/api/v1/me/profile')
            .set('Cookie', cookie)
            .send({ billingEmail: 'not-an-email' });
        expect(res.status).toBe(400);
    });

    it('does not gate legacy customers without registrationMethod', async () => {
        const company = await Company.create({ name: 'לקוח ותיק', vatNumber: '511111111' });
        const legacy = await User.create({
            name: 'לקוח ותיק',
            email: 'legacy@example.com',
            password: 'Legacy123',
            role: 'customer',
            company: company._id,
            isActive: true,
            registrationStatus: 'approved',
        });

        const res = await request(app)
            .post('/api/v1/me/orders')
            .set('Cookie', authCookieFor(legacy))
            .send(ORDER_BODY);
        expect(res.status).toBe(201);
    });
});
