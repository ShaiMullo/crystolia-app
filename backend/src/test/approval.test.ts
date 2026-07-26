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
import User, { IUser } from '../models/User.js';
import Company from '../models/Company.js';

const app = buildTestApp();

let adminCookie = '';

beforeAll(async () => {
    await startTestDb();
});
afterAll(async () => {
    await stopTestDb();
});
beforeEach(async () => {
    await clearDb();
    const admin = await createAdmin();
    adminCookie = authCookieFor(admin);
});

async function registerPendingUser(overrides: Record<string, unknown> = {}): Promise<IUser> {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ ...VALID_REGISTRATION, ...overrides });
    expect(res.status).toBe(202);
    const user = await User.findOne({ email: (overrides.email as string) ?? VALID_REGISTRATION.email });
    return user!;
}

describe('POST /api/v1/users/:id/approve-registration', () => {
    it('approves a pending registration: creates the company, activates the user, enables login', async () => {
        const user = await registerPendingUser();

        const res = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
        expect(res.body.data.alreadyApproved).toBe(false);

        const updated = await User.findById(user._id);
        expect(updated!.registrationStatus).toBe('approved');
        expect(updated!.isActive).toBe(true);
        expect(updated!.approvedAt).toBeInstanceOf(Date);
        expect(String(updated!.approvedBy)).toHaveLength(24);
        expect(updated!.isCompanyOwner).toBe(true);

        const company = await Company.findById(updated!.company);
        expect(company).not.toBeNull();
        expect(company!.name).toBe(VALID_REGISTRATION.companyName);
        expect(company!.vatNumber).toBe(VALID_REGISTRATION.vatNumber);
        expect(company!.country).toBe('IL');
        expect(String(company!.owner)).toBe(String(user._id));

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password });
        expect(login.status).toBe(200);
    });

    it('is idempotent: a double-click neither re-sends email nor duplicates data', async () => {
        const user = await registerPendingUser();

        const first = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(first.body.data.alreadyApproved).toBe(false);
        const afterFirst = await User.findById(user._id).lean();

        const second = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(second.status).toBe(200);
        expect(second.body.data.alreadyApproved).toBe(true);

        const afterSecond = await User.findById(user._id).lean();
        // No data mutation on the second call (incl. notification bookkeeping —
        // the approved email is NOT re-attempted).
        expect(afterSecond!.approvedAt).toEqual(afterFirst!.approvedAt);
        expect(afterSecond!.registrationNotifications?.approvedEmailAt)
            .toEqual(afterFirst!.registrationNotifications?.approvedEmailAt);
        expect(await Company.countDocuments({})).toBe(1);
    });

    it('blocks a competing approve/reject while an approval lock is active', async () => {
        const user = await registerPendingUser();
        await User.updateOne(
            { _id: user._id },
            { $set: { approvalLock: 'active-lock', approvalInProgressAt: new Date() } },
        );

        const approve = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(approve.status).toBe(409);

        const reject = await request(app)
            .post(`/api/v1/users/${user._id}/reject-registration`)
            .set('Cookie', adminCookie)
            .send({});
        expect(reject.status).toBe(409);

        const unchanged = await User.findById(user._id);
        expect(unchanged!.registrationStatus).toBe('pending');
        expect(unchanged!.isActive).toBe(false);
        expect(await Company.countDocuments({})).toBe(0);
    });

    it('recovers a Company created by an interrupted approval and links it safely', async () => {
        const user = await registerPendingUser();
        const orphan = await Company.create({
            name: VALID_REGISTRATION.companyName,
            vatNumber: VALID_REGISTRATION.vatNumber,
            country: 'IL',
            owner: user._id,
        });

        const res = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);

        const updated = await User.findById(user._id);
        expect(String(updated!.company)).toBe(String(orphan._id));
        expect(updated!.registrationStatus).toBe('approved');
        expect(updated!.isActive).toBe(true);
        expect(await Company.countDocuments({ owner: user._id })).toBe(1);
    });

    it('returns 409 and stays pending when the company name already exists', async () => {
        await Company.create({ name: VALID_REGISTRATION.companyName, vatNumber: '598765432' });
        const user = await registerPendingUser();

        const res = await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(409);

        const updated = await User.findById(user._id);
        expect(updated!.registrationStatus).toBe('pending'); // rolled back for manual review
        expect(updated!.isActive).toBe(false);
    });

    it('is admin-only', async () => {
        const user = await registerPendingUser();
        const anon = await request(app).post(`/api/v1/users/${user._id}/approve-registration`);
        expect(anon.status).toBe(401);
    });
});

describe('POST /api/v1/users/:id/reject-registration', () => {
    it('rejects a pending registration and blocks login', async () => {
        const user = await registerPendingUser();

        const res = await request(app)
            .post(`/api/v1/users/${user._id}/reject-registration`)
            .set('Cookie', adminCookie)
            .send({ reason: 'פרטי חברה לא תקינים', shareReason: true });
        expect(res.status).toBe(200);
        expect(res.body.data.alreadyRejected).toBe(false);

        const updated = await User.findById(user._id);
        expect(updated!.registrationStatus).toBe('rejected');
        expect(updated!.isActive).toBe(false);
        expect(updated!.rejectionReason).toBe('פרטי חברה לא תקינים');
        expect(updated!.rejectedAt).toBeInstanceOf(Date);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password });
        expect(login.status).toBe(401);
    });

    it('is idempotent and cannot reject an approved account', async () => {
        const user = await registerPendingUser();
        await request(app)
            .post(`/api/v1/users/${user._id}/reject-registration`)
            .set('Cookie', adminCookie)
            .send({});
        const again = await request(app)
            .post(`/api/v1/users/${user._id}/reject-registration`)
            .set('Cookie', adminCookie)
            .send({});
        expect(again.status).toBe(200);
        expect(again.body.data.alreadyRejected).toBe(true);

        // Reverse via approve, then reject must refuse.
        await request(app)
            .post(`/api/v1/users/${user._id}/approve-registration`)
            .set('Cookie', adminCookie);
        const rejectApproved = await request(app)
            .post(`/api/v1/users/${user._id}/reject-registration`)
            .set('Cookie', adminCookie)
            .send({});
        expect(rejectApproved.status).toBe(409);
    });
});

describe('registrations listing / count / resend', () => {
    it('lists registration requests with pagination and filters by status', async () => {
        await registerPendingUser();
        await registerPendingUser({ email: 'second@example.com', vatNumber: '512345678', companyName: 'חברה שנייה' });

        const list = await request(app)
            .get('/api/v1/users/registrations?status=pending')
            .set('Cookie', adminCookie);
        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(2);
        expect(list.body.pagination.total).toBe(2);
        expect(list.body.data[0].registrationCompany).toBeDefined();
        expect(list.body.data[0].password).toBeUndefined();

        const count = await request(app)
            .get('/api/v1/users/registrations/count')
            .set('Cookie', adminCookie);
        expect(count.body.data.pending).toBe(2);

        const single = await request(app)
            .get(`/api/v1/users/registrations/${list.body.data[0]._id}`)
            .set('Cookie', adminCookie);
        expect(single.status).toBe(200);
        expect(single.body.data.email).toBeDefined();
    });

    it('resends the email matching the current status', async () => {
        const user = await registerPendingUser();
        const res = await request(app)
            .post(`/api/v1/users/${user._id}/resend-registration-email`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
        expect(res.body.data.kind).toBe('pending');
        // Providers unconfigured in tests → not sent, but the endpoint reports
        // that truthfully instead of failing.
        expect(res.body.data.sent).toBe(false);
    });
});

describe('legacy PATCH /api/v1/users/:id { isActive: true } compatibility', () => {
    it('still approves a pending registration and materializes the company snapshot', async () => {
        const user = await registerPendingUser();

        const res = await request(app)
            .patch(`/api/v1/users/${user._id}`)
            .set('Cookie', adminCookie)
            .send({ isActive: true });
        expect(res.status).toBe(200);

        const updated = await User.findById(user._id);
        expect(updated!.registrationStatus).toBe('approved');
        expect(updated!.isActive).toBe(true);
        expect(updated!.company).toBeDefined();
        expect(await Company.countDocuments({ name: VALID_REGISTRATION.companyName })).toBe(1);
    });

    it('does not break existing approved users (regression)', async () => {
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

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'legacy@example.com', password: 'Legacy123' });
        expect(login.status).toBe(200);

        const patch = await request(app)
            .patch(`/api/v1/users/${legacy._id}`)
            .set('Cookie', adminCookie)
            .send({ phone: '050-9999999' });
        expect(patch.status).toBe(200);
    });
});

describe('soft-deleted customer re-registration', () => {
    it('turns the same email into a fresh pending request and safely reuses its owned company on approval', async () => {
        const original = await registerPendingUser();
        const firstApproval = await request(app)
            .post(`/api/v1/users/${original._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(firstApproval.status).toBe(200);

        const approved = await User.findById(original._id);
        const originalCompanyId = String(approved!.company);
        const originalTokenVersion = approved!.tokenVersion;

        const deletion = await request(app)
            .delete(`/api/v1/users/${original._id}`)
            .set('Cookie', adminCookie);
        expect(deletion.status).toBe(200);

        const reRegistration = await request(app)
            .post('/api/auth/register')
            .send({
                ...VALID_REGISTRATION,
                name: 'ישראל נרשם מחדש',
                password: 'FreshPassword2',
            });
        expect(reRegistration.status).toBe(202);
        expect(reRegistration.body.status).toBe('pending_approval');

        const revived = await User.findOne({ email: VALID_REGISTRATION.email });
        expect(revived).not.toBeNull();
        expect(String(revived!._id)).toBe(String(original._id));
        expect(await User.countDocuments({ email: VALID_REGISTRATION.email })).toBe(1);
        expect(revived!.name).toBe('ישראל נרשם מחדש');
        expect(revived!.isDeleted).toBe(false);
        expect(revived!.deletedAt).toBeUndefined();
        expect(revived!.isActive).toBe(false);
        expect(revived!.registrationStatus).toBe('pending');
        expect(revived!.registrationMethod).toBe('password');
        expect(revived!.company).toBeUndefined();
        expect(revived!.approvedAt).toBeUndefined();
        expect(revived!.approvedBy).toBeUndefined();
        expect(revived!.tokenVersion).toBeGreaterThan(originalTokenVersion);

        const pendingLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: 'FreshPassword2' });
        expect(pendingLogin.status).toBe(403);

        const secondApproval = await request(app)
            .post(`/api/v1/users/${original._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(secondApproval.status).toBe(200);

        const reapproved = await User.findById(original._id);
        expect(String(reapproved!.company)).toBe(originalCompanyId);
        expect(await Company.countDocuments({})).toBe(1);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: VALID_REGISTRATION.email, password: 'FreshPassword2' });
        expect(login.status).toBe(200);
    });

    it('allows the same historical user to register a different company without overwriting the old company', async () => {
        const original = await registerPendingUser();
        await request(app)
            .post(`/api/v1/users/${original._id}/approve-registration`)
            .set('Cookie', adminCookie);

        const firstApproved = await User.findById(original._id);
        const oldCompanyId = String(firstApproved!.company);

        await request(app)
            .delete(`/api/v1/users/${original._id}`)
            .set('Cookie', adminCookie);

        const secondRegistration = {
            ...VALID_REGISTRATION,
            companyName: 'עסק חדש לאותו אדם',
            vatNumber: '513333333',
            password: 'AnotherPassword3',
        };
        const reRegistration = await request(app)
            .post('/api/auth/register')
            .send(secondRegistration);
        expect(reRegistration.status).toBe(202);

        const revived = await User.findOne({ email: VALID_REGISTRATION.email });
        const approval = await request(app)
            .post(`/api/v1/users/${revived!._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(approval.status).toBe(200);

        const reapproved = await User.findById(revived!._id);
        expect(String(reapproved!.company)).not.toBe(oldCompanyId);
        expect(await Company.countDocuments({})).toBe(2);

        const oldCompany = await Company.findById(oldCompanyId);
        const newCompany = await Company.findById(reapproved!.company);
        expect(oldCompany!.name).toBe(VALID_REGISTRATION.companyName);
        expect(oldCompany!.vatNumber).toBe(VALID_REGISTRATION.vatNumber);
        expect(newCompany!.name).toBe(secondRegistration.companyName);
        expect(newCompany!.vatNumber).toBe(secondRegistration.vatNumber);
    });

    it('reclaims an exact orphaned legacy company only when no live user is linked', async () => {
        const orphan = await Company.create({
            name: VALID_REGISTRATION.companyName,
            vatNumber: VALID_REGISTRATION.vatNumber,
            email: VALID_REGISTRATION.email,
        });
        const pending = await registerPendingUser();

        const approval = await request(app)
            .post(`/api/v1/users/${pending._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(approval.status).toBe(200);

        const approved = await User.findById(pending._id);
        expect(String(approved!.company)).toBe(String(orphan._id));
        expect(await Company.countDocuments({})).toBe(1);
        expect(String((await Company.findById(orphan._id))!.owner)).toBe(String(pending._id));
    });

    it('reclaims and renames the same historical company when its VAT is unchanged', async () => {
        const original = await registerPendingUser();
        await request(app)
            .post(`/api/v1/users/${original._id}/approve-registration`)
            .set('Cookie', adminCookie);

        const firstApproved = await User.findById(original._id);
        const historicalCompanyId = String(firstApproved!.company);

        await request(app)
            .delete(`/api/v1/users/${original._id}`)
            .set('Cookie', adminCookie);

        const newCompanyName = 'שם מסחרי חדש לאותה חברה';
        const reRegistration = await request(app)
            .post('/api/auth/register')
            .send({
                ...VALID_REGISTRATION,
                companyName: newCompanyName,
                password: 'RenamedCompany4',
            });
        expect(reRegistration.status).toBe(202);

        const revived = await User.findOne({ email: VALID_REGISTRATION.email });
        const approval = await request(app)
            .post(`/api/v1/users/${revived!._id}/approve-registration`)
            .set('Cookie', adminCookie);
        expect(approval.status).toBe(200);

        const reapproved = await User.findById(revived!._id);
        const company = await Company.findById(historicalCompanyId);
        expect(String(reapproved!.company)).toBe(historicalCompanyId);
        expect(await Company.countDocuments({})).toBe(1);
        expect(company!.name).toBe(newCompanyName);
        expect(company!.vatNumber).toBe(VALID_REGISTRATION.vatNumber);
        expect(String(company!.owner)).toBe(String(revived!._id));
    });
});
