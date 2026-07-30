// ===============================================
// 👥 Users Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError, validate } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { generateTempPassword } from '../utils/password.js';
import {
    approveRegistration,
    rejectRegistration,
    ensureCompanyFromSnapshot,
    approvalLockFreeFilter,
    registrationRetryLeaseFreeFilter,
} from '../services/registrationService.js';
import { sendRegistrationEmail } from '../services/registrationNotificationService.js';

const router = Router();

// Count admins who can still log in — used by the last-active-admin guards.
async function activeAdminCount(): Promise<number> {
    return User.countDocuments({ role: 'admin', isActive: true, isDeleted: { $ne: true } });
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/me - Current user's profile
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/me', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user?._id)
            .select('-password -__v')
            .populate('company')
            .lean();

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Registration requests (/registrations must precede /:id param routes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// The registrations screen shows every request that went through the public
// business-registration flow: all pending + rejected customers (including
// legacy pendings created before registrationMethod existed) and approved
// ones that carry a registrationMethod.
function registrationBaseQuery(): Record<string, unknown> {
    return {
        role: 'customer',
        isDeleted: { $ne: true },
        $or: [
            { registrationStatus: { $in: ['pending', 'rejected'] } },
            { registrationMethod: { $exists: true } },
        ],
    };
}

const REGISTRATION_POPULATE = [
    { path: 'company', select: 'name vatNumber country phone' },
    { path: 'approvedBy', select: 'name email' },
    { path: 'rejectedBy', select: 'name email' },
] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/registrations - List registration requests
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/registrations', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, search, page, limit } = req.query as Record<string, string | undefined>;

        const query = registrationBaseQuery();
        if (status === 'pending' || status === 'approved' || status === 'rejected') {
            query.registrationStatus = status;
        }
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            query.$and = [{ $or: [{ name: rx }, { email: rx }, { 'registrationCompany.name': rx }] }];
        }

        const p = Math.max(1, parseInt(page || '1', 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25));

        const [total, users] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .select('-password')
                .populate(REGISTRATION_POPULATE as any)
                // A legacy pending request can be completed by a later valid
                // resubmission. Sort by the latest activity so that request
                // immediately surfaces for administrators without rewriting
                // its original creation timestamp.
                .sort({ updatedAt: -1, createdAt: -1 })
                .skip((p - 1) * l)
                .limit(l)
                .lean(),
        ]);

        res.json({
            success: true,
            data: users,
            pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/registrations/count - Pending badge counter
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/registrations/count', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pending = await User.countDocuments({
            role: 'customer',
            isDeleted: { $ne: true },
            registrationStatus: 'pending',
        });
        res.json({ success: true, data: { pending } });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/registrations/:id - Single registration request
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/registrations/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Registration not found', 404);
        }
        const user = await User.findOne({
            _id: req.params.id,
            role: 'customer',
            isDeleted: { $ne: true },
        })
            .select('-password')
            .populate(REGISTRATION_POPULATE as any)
            .lean();

        if (!user) {
            throw new AppError('Registration not found', 404);
        }
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users/:id/approve-registration
// 🔒 Protected: Admin Only. Idempotent — a double-click never re-sends the
// approval email or mutates data twice.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/approve-registration', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Registration not found', 404);
        }
        const outcome = await approveRegistration(req.params.id, req.user?._id as any);

        if (outcome.status === 'not_found') {
            throw new AppError('Registration not found', 404);
        }
        if (outcome.status === 'conflict') {
            throw new AppError(
                outcome.conflictField === 'vatNumber'
                    ? 'A company with this VAT / company number already exists — resolve manually before approving'
                    : 'A company with this name already exists — resolve manually before approving',
                409,
            );
        }
        if (outcome.status === 'in_progress') {
            throw new AppError('Registration approval is already in progress — try again shortly', 409);
        }
        if (outcome.status === 'already_approved') {
            return res.json({ success: true, data: { alreadyApproved: true, user: outcome.user } });
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: req.params.id,
            req,
            details: { registrationApproved: true },
        });

        res.json({
            success: true,
            data: {
                alreadyApproved: false,
                emailNotificationSent: outcome.emailResult.success,
                user: outcome.user,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users/:id/reject-registration
// 🔒 Protected: Admin Only. Idempotent.
// Body: { reason?: string, notifyCustomer?: boolean, shareReason?: boolean }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/reject-registration', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Registration not found', 404);
        }
        const outcome = await rejectRegistration(req.params.id, req.user?._id as any, {
            reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
            notifyCustomer: req.body?.notifyCustomer !== false,
            shareReason: req.body?.shareReason === true,
        });

        if (outcome.status === 'not_found') {
            throw new AppError('Registration not found', 404);
        }
        if (outcome.status === 'approved_cannot_reject') {
            throw new AppError('An approved account cannot be rejected — deactivate it from user management instead', 409);
        }
        if (outcome.status === 'in_progress') {
            throw new AppError('Registration approval is already in progress — try again shortly', 409);
        }
        if (outcome.status === 'already_rejected') {
            return res.json({ success: true, data: { alreadyRejected: true, user: outcome.user } });
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: req.params.id,
            req,
            details: { registrationRejected: true, reasonProvided: Boolean(req.body?.reason) },
            severity: 'warning',
        });

        res.json({
            success: true,
            data: {
                alreadyRejected: false,
                emailNotificationSent: outcome.emailResult?.success ?? false,
                user: outcome.user,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users/:id/resend-registration-email
// 🔒 Protected: Admin Only. Resends the email that matches the request's
// current status (pending / approved / rejected).
// Safe-delivery rules (PR #80 review):
//  * an email recorded as `sent` is never resent (409 NOTHING_TO_RETRY);
//  * a never-recorded or `unknown` outcome (crash mid-send) requires
//    body.confirmUnknown=true — an explicit admin acknowledgment of
//    possible duplication;
//  * the atomic claim binds the exact registration status AND the exact
//    recorded delivery value plus a lease token, so a concurrent resend or
//    a status change invalidates it (429/409);
//  * the status is persisted as `unknown` BEFORE the provider call, so a
//    crash is visible and never auto-resent. NOT idempotent end-to-end:
//    the email provider offers no documented idempotency key — the
//    `unknown` state is the honest mitigation.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/:id/resend-registration-email', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Registration not found', 404);
        }
        const user = await User.findOne({ _id: req.params.id, role: 'customer', isDeleted: { $ne: true } })
            .populate('company', 'name');
        if (!user) {
            throw new AppError('Registration not found', 404);
        }

        const kind = user.registrationStatus === 'approved'
            ? 'approved'
            : user.registrationStatus === 'rejected'
                ? 'rejected'
                : 'pending';
        const field = `${kind}EmailStatus` as const;
        const current = user.registrationNotifications?.[field] ?? null;

        if (current === 'sent') {
            return res.status(409).json({ success: false, error: 'NOTHING_TO_RETRY' });
        }
        if ((current === 'unknown' || current === null) && req.body?.confirmUnknown !== true) {
            return res.status(409).json({ success: false, error: 'UNKNOWN_DELIVERY_CONFIRM_REQUIRED' });
        }

        const attemptId = randomUUID();
        const now = new Date();
        const claimed = await User.findOneAndUpdate(
            {
                _id: user._id,
                registrationStatus: user.registrationStatus,
                [`registrationNotifications.${field}`]: current,
                // Symmetric mutual exclusion: no live retry lease AND no live
                // approval/rejection lock ($and keeps the $or fragments intact).
                $and: [registrationRetryLeaseFreeFilter(now), approvalLockFreeFilter(now)],
            },
            {
                $set: {
                    'registrationNotifications.retryAttemptId': attemptId,
                    'registrationNotifications.retryStartedAt': now,
                    // Persisted BEFORE the provider call — a crash leaves an
                    // explicit `unknown`, never a silent duplicate later.
                    [`registrationNotifications.${field}`]: 'unknown',
                    [`registrationNotifications.${kind}EmailAt`]: now,
                },
            },
            { new: true },
        ).populate('company', 'name');
        if (!claimed) {
            return res.status(429).json({ success: false, error: 'RETRY_IN_PROGRESS' });
        }

        const companyName = claimed.registrationCompany?.name
            || (claimed.company as any)?.name
            || undefined;
        // Reason-sharing repeats the ORIGINAL rejection decision unless the
        // admin explicitly overrides it in this request. Legacy records
        // without the stored decision default to NOT sharing — the reason is
        // never silently added or dropped.
        const shareReason = typeof req.body?.shareReason === 'boolean'
            ? req.body.shareReason
            : (claimed.rejectionReasonShared ?? false);

        // sendRegistrationEmail records the final sent/failed/skipped itself.
        const emailResult = await sendRegistrationEmail(claimed, kind, {
            companyName,
            reason: kind === 'rejected' && shareReason ? claimed.rejectionReason : undefined,
        });

        // Release the lease only if it is still OURS.
        await User.updateOne(
            { _id: user._id, 'registrationNotifications.retryAttemptId': attemptId },
            { $unset: { 'registrationNotifications.retryAttemptId': 1, 'registrationNotifications.retryStartedAt': 1 } },
        );

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: req.params.id,
            req,
            details: {
                registrationEmailResent: kind,
                sent: emailResult.success,
                attemptId,
                result: emailResult.success
                    ? 'sent'
                    : emailResult.error === 'Configuration missing' ? 'skipped' : 'failed',
            },
        });

        res.json({
            success: true,
            data: {
                kind,
                sent: emailResult.success,
                result: emailResult.success
                    ? 'sent'
                    : emailResult.error === 'Configuration missing' ? 'skipped' : 'failed',
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users - List users (filters + opt-in pagination)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role, status, search, company, page, limit } = req.query as Record<
            string,
            string | undefined
        >;

        const query: Record<string, unknown> = { isDeleted: { $ne: true } };
        if (role) query.role = role;
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') {
            query.isActive = false;
            // Pending/rejected registrations live on the registrations screen.
            query.registrationStatus = { $nin: ['pending', 'rejected'] };
        } else if (status === 'pending') query.registrationStatus = 'pending';
        else if (status === 'rejected') query.registrationStatus = 'rejected';
        if (company) query.company = company;
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            query.$or = [{ name: rx }, { email: rx }];
        }

        const base = User.find(query)
            .select('-password')
            .populate('company', 'name')
            .sort({ createdAt: -1 });

        // Backward compatible: only paginate when page/limit is supplied.
        if (page !== undefined || limit !== undefined) {
            const p = Math.max(1, parseInt(page || '1', 10) || 1);
            const l = Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25));
            const total = await User.countDocuments(query);
            const users = await base.skip((p - 1) * l).limit(l).lean();
            return res.json({
                success: true,
                data: users,
                pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) },
            });
        }

        const users = await base.lean();
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users - Create user
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, company, phone, mustChangePassword } = req.body;

        if (!email || !password || !role) {
            throw new AppError('Email, password, and role are required', 400);
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        const newUser = new User({
            name,
            email,
            password,
            role,
            phone,
            isActive: true,
            registrationStatus: 'approved',
            approvedAt: new Date(),
            approvedBy: req.user?._id,
            mustChangePassword: Boolean(mustChangePassword),
        });
        // Company only applies to customers (schema requires null for admin/agent).
        if (role === 'customer' && company) {
            newUser.set('company', company);
        }
        await newUser.save();

        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { name, email, role },
        });

        newUser.password = undefined;
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/users/:id - Update user (+ safety guards)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, isActive, phone, company } = req.body;
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate || userToUpdate.isDeleted) {
            throw new AppError('User not found', 404);
        }

        const isSelf = String(userToUpdate._id) === String(req.user?._id);
        // Activating either a pending or a rejected registration through the
        // legacy toggle re-approves it (and clears any rejection bookkeeping),
        // so isActive can never contradict registrationStatus.
        const wasPendingRegistration =
            userToUpdate.registrationStatus === 'pending' || userToUpdate.registrationStatus === 'rejected';
        const newRole = role ?? userToUpdate.role;
        const newActive = isActive ?? userToUpdate.isActive;

        // ── Guards ───────────────────────────────────────────────
        if (isSelf && newActive === false && userToUpdate.isActive) {
            throw new AppError('You cannot deactivate your own account', 400);
        }
        if (isSelf && userToUpdate.role === 'admin' && newRole !== 'admin') {
            throw new AppError('You cannot remove your own admin role', 400);
        }
        if (userToUpdate.role === 'admin' && userToUpdate.isActive && newActive === false) {
            if ((await activeAdminCount()) <= 1) {
                throw new AppError('Cannot deactivate the last active admin', 400);
            }
        }
        if (userToUpdate.role === 'admin' && userToUpdate.isActive && newRole !== 'admin') {
            if ((await activeAdminCount()) <= 1) {
                throw new AppError('Cannot demote the last active admin', 400);
            }
        }

        // ── Apply updates ────────────────────────────────────────
        if (name !== undefined) userToUpdate.name = name;
        if (email !== undefined) userToUpdate.email = email;
        if (phone !== undefined) userToUpdate.phone = phone;
        if (role !== undefined) userToUpdate.role = role;
        if (isActive !== undefined) {
            userToUpdate.isActive = isActive;
            if (isActive && wasPendingRegistration) {
                userToUpdate.registrationStatus = 'approved';
                userToUpdate.approvedAt = new Date();
                userToUpdate.approvedBy = req.user?._id;
                userToUpdate.rejectedAt = undefined;
                userToUpdate.rejectedBy = undefined;
                userToUpdate.rejectionReason = undefined;
                // New-flow registrations carry the business details as a
                // snapshot — materialize the Company on activation too, so
                // the legacy toggle stays equivalent to approve-registration.
                const companyResult = await ensureCompanyFromSnapshot(userToUpdate);
                if (!companyResult.ok) {
                    throw new AppError(
                        companyResult.conflictField === 'vatNumber'
                            ? 'A company with this VAT / company number already exists — resolve manually before approving'
                            : 'A company with this name already exists — resolve manually before approving',
                        409,
                    );
                }
            }
        }

        // Company: only customers may have one; clear it for admin/agent.
        if (newRole === 'customer') {
            if (company !== undefined) userToUpdate.set('company', company);
        } else {
            userToUpdate.set('company', undefined);
        }

        // Admin-initiated password change forces a change on next login and
        // invalidates the user's other active sessions.
        if (password) {
            userToUpdate.password = password; // hashed + validated by the model on save
            userToUpdate.mustChangePassword = true;
            userToUpdate.tokenVersion = (userToUpdate.tokenVersion || 0) + 1;
        }

        await userToUpdate.save();

        if (isActive === true && wasPendingRegistration) {
            const emailResult = await sendRegistrationEmail(userToUpdate, 'approved');
            if (!emailResult.success) {
                console.warn('[Registration] Approval email was not delivered:', emailResult.error);
            }
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: userToUpdate._id.toString(),
            req,
            details: {
                updates: Object.keys(req.body),
                ...(isActive === true && wasPendingRegistration ? { registrationApproved: true } : {}),
            }, // key names only — never values
        });

        userToUpdate.password = undefined;
        res.json({ success: true, data: userToUpdate });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users/:id/reset-password - Admin reset (temp shown once)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/reset-password', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) {
            throw new AppError('User not found', 404);
        }

        const tempPassword = generateTempPassword();
        user.password = tempPassword; // hashed + validated by the model on save
        user.mustChangePassword = true;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate existing sessions

        await user.save();

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: user._id.toString(),
            req,
            details: { field: 'password', reset: true }, // never the password/hash
            severity: 'warning',
        });

        // Returned ONCE. Never logged or persisted in plaintext.
        res.json({ success: true, data: { tempPassword } });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/users/:id - Soft delete (+ guards)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) {
            throw new AppError('User not found', 404);
        }

        if (String(user._id) === String(req.user?._id)) {
            throw new AppError('You cannot delete your own account', 400);
        }
        if (user.role === 'admin' && user.isActive && (await activeAdminCount()) <= 1) {
            throw new AppError('Cannot delete the last active admin', 400);
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        user.isActive = false; // excluded from listings + blocked by protect immediately
        // Defense-in-depth: invalidate any live sessions too, consistent with
        // password reset/change — isActive alone already blocks protect().
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        await logAudit({
            action: 'DELETE',
            entity: 'User',
            entityId: user._id.toString(),
            req,
            details: { soft: true },
            severity: 'warning',
        });

        res.json({ success: true, data: { id: user._id, isDeleted: true } });
    } catch (error) {
        next(error);
    }
});

export default router;
