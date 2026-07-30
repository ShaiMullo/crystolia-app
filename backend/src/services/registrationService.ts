// ===============================================
// Registration Approval / Rejection Service
// ===============================================
// Owns the state machine of a business-registration request:
//
//   pending ──approve──▶ approved      (Company created from the snapshot)
//   pending ──reject───▶ rejected      (reversible via approve)
//
// Both transitions are claimed with a short-lived atomic lock while the user
// remains inactive. A double click cannot send two emails, and a process exit
// between Company creation and User linking is recoverable on the next try.

import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import Company from '../models/Company.js';
import { sendRegistrationEmail } from './registrationNotificationService.js';
import type { SendEmailResult } from './emailService.js';

export type ApproveOutcome =
    | { status: 'approved'; user: IUser; emailResult: SendEmailResult }
    | { status: 'already_approved'; user: IUser }
    | { status: 'in_progress' }
    | { status: 'conflict'; conflictField: string }
    | { status: 'not_found' };

export type RejectOutcome =
    | { status: 'rejected'; user: IUser; emailResult?: SendEmailResult }
    | { status: 'already_rejected'; user: IUser }
    | { status: 'in_progress' }
    | { status: 'approved_cannot_reject' }
    | { status: 'not_found' };

const APPROVAL_LOCK_TTL_MS = 2 * 60 * 1000;
const REGISTRATION_RETRY_LEASE_TTL_MS = 10 * 60 * 1000;

/** No live approval/rejection lock (stale locks pass). Shared with the
 *  registration-email retry so the two workflows exclude each other. */
export function approvalLockFreeFilter(now = new Date()) {
    const staleBefore = new Date(now.getTime() - APPROVAL_LOCK_TTL_MS);
    return {
        $or: [
            { approvalLock: { $exists: false } },
            { approvalInProgressAt: { $lt: staleBefore } },
        ],
    };
}

/** No live registration-email retry lease (stale leases pass). */
export function registrationRetryLeaseFreeFilter(now = new Date()) {
    const staleBefore = new Date(now.getTime() - REGISTRATION_RETRY_LEASE_TTL_MS);
    return {
        $or: [
            { 'registrationNotifications.retryAttemptId': { $exists: false } },
            { 'registrationNotifications.retryAttemptId': null },
            { 'registrationNotifications.retryStartedAt': { $lt: staleBefore } },
        ],
    };
}

/**
 * Create the Company from the registration snapshot and link it, if the user
 * does not already have one. Conflicts (duplicate name / VAT) are reported —
 * never silently merged into an unrelated company.
 * The caller is responsible for saving the user afterwards.
 */
export async function ensureCompanyFromSnapshot(
    user: IUser,
): Promise<{ ok: true } | { ok: false; conflictField: string }> {
    if (user.company || !user.registrationCompany) return { ok: true };
    const snapshot = user.registrationCompany;

    // Crash/re-registration recovery: a user can legitimately own a historical
    // company and now register a different one. Therefore ownership alone is
    // not a conflict and must not short-circuit approval. Reuse only an owned
    // company whose exact legal identity matches this registration snapshot.
    const ownedCompany = await Company.findOne({
        owner: user._id,
        name: snapshot.name,
        vatNumber: snapshot.vatNumber,
    }).select('_id').lean();
    if (ownedCompany) {
        user.set('company', ownedCompany._id);
        user.isCompanyOwner = true;
        return { ok: true };
    }

    // Pre-check for a clear admin-facing message (the unique indexes below
    // remain the authoritative guard against races).
    const [nameTaken, vatTaken] = await Promise.all([
        Company.findOne({ name: snapshot.name }).select('_id owner email billingEmail').lean(),
        Company.findOne({ vatNumber: snapshot.vatNumber }).select('_id owner email billingEmail').lean(),
    ]);

    const mayReclaim = async (
        candidate: NonNullable<typeof vatTaken>,
    ): Promise<boolean> => {
        const normalizedEmail = user.email.toLowerCase();
        const ownerMatches = candidate.owner && String(candidate.owner) === String(user._id);
        const ownerMissing = !candidate.owner;
        const contactMatches = [candidate.email, candidate.billingEmail]
            .some((value) => value?.toLowerCase() === normalizedEmail);
        if (!ownerMatches && !ownerMissing && !contactMatches) return false;

        const anotherLiveUser = await User.exists({
            _id: { $ne: user._id },
            company: candidate._id,
            isDeleted: { $ne: true },
        });
        return !anotherLiveUser;
    };

    // Legacy/demo data may contain the exact company but no longer have a live
    // user linked after all its users were soft-deleted. An explicit admin
    // approval may safely reclaim that exact name+VAT pair when the old owner
    // is this user, the company has no owner, or its contact email proves the
    // same mailbox — and no other live user is linked to it.
    if (
        nameTaken
        && vatTaken
        && String(nameTaken._id) === String(vatTaken._id)
    ) {
        const candidate = nameTaken;
        if (await mayReclaim(candidate)) {
            await Company.updateOne(
                { _id: candidate._id },
                { $set: { owner: user._id } },
            );
            user.set('company', candidate._id);
            user.isCompanyOwner = true;
            return { ok: true };
        }
    }

    // A VAT/company number is the durable legal identity; a business name may
    // legitimately change between registrations. If that VAT belongs to this
    // user's historical/orphaned company and the requested new name is free,
    // reclaim and rename the same Company instead of creating a duplicate.
    // Orders/invoices keep their original company reference and remain intact.
    if (
        vatTaken
        && (!nameTaken || String(nameTaken._id) === String(vatTaken._id))
        && await mayReclaim(vatTaken)
    ) {
        await Company.updateOne(
            { _id: vatTaken._id },
            {
                $set: {
                    name: snapshot.name,
                    owner: user._id,
                    country: snapshot.country,
                    phone: snapshot.phone || user.phone,
                    email: user.email,
                    billingEmail: user.email,
                },
            },
            { runValidators: true },
        );
        user.set('company', vatTaken._id);
        user.isCompanyOwner = true;
        return { ok: true };
    }

    if (nameTaken) return { ok: false, conflictField: 'name' };
    if (vatTaken) return { ok: false, conflictField: 'vatNumber' };

    try {
        const company = await Company.create({
            name: snapshot.name,
            vatNumber: snapshot.vatNumber,
            country: snapshot.country,
            phone: snapshot.phone || user.phone,
            email: user.email,
            billingEmail: user.email,
            owner: user._id,
        });
        user.set('company', company._id);
        user.isCompanyOwner = true;
        return { ok: true };
    } catch (error) {
        const err = error as { code?: number; keyPattern?: Record<string, unknown> };
        if (err.code === 11000) {
            return { ok: false, conflictField: Object.keys(err.keyPattern || {})[0] || 'name' };
        }
        throw error;
    }
}

export async function approveRegistration(
    userId: string,
    adminId: mongoose.Types.ObjectId | string | undefined,
): Promise<ApproveOutcome> {
    // Atomically lock the transition while the account is still inactive.
    // Keeping registrationStatus pending/rejected until the Company exists
    // avoids a crash window where a user could sign in with no linked Company.
    const lock = crypto.randomUUID();
    const now = new Date();
    const claimed = await User.findOneAndUpdate(
        {
            _id: userId,
            role: 'customer',
            isDeleted: { $ne: true },
            registrationStatus: { $in: ['pending', 'rejected'] },
            // Symmetric mutual exclusion with the registration-email retry:
            // approval may not start while a retry lease is live.
            $and: [approvalLockFreeFilter(now), registrationRetryLeaseFreeFilter(now)],
        },
        {
            $set: {
                approvalLock: lock,
                approvalInProgressAt: now,
            },
        },
        { new: true },
    );

    if (!claimed) {
        const existing = await User.findOne({ _id: userId, role: 'customer', isDeleted: { $ne: true } });
        if (existing && existing.registrationStatus === 'approved') {
            return { status: 'already_approved', user: existing };
        }
        if (existing && ['pending', 'rejected'].includes(existing.registrationStatus)) {
            return { status: 'in_progress' };
        }
        return { status: 'not_found' };
    }

    try {
        // Create the Company from the registration snapshot. Legacy pending
        // users already carry a linked company and skip this.
        const companyResult = await ensureCompanyFromSnapshot(claimed);
        if (!companyResult.ok) {
            await User.updateOne(
                { _id: claimed._id, approvalLock: lock },
                { $unset: { approvalLock: 1, approvalInProgressAt: 1 } },
            );
            return { status: 'conflict', conflictField: companyResult.conflictField };
        }

        // One atomic user update publishes the approval only after the Company
        // is ready. The lock token ensures no stale attempt can win later.
        const approved = await User.findOneAndUpdate(
            { _id: claimed._id, approvalLock: lock },
            {
                $set: {
                    registrationStatus: 'approved',
                    isActive: true,
                    approvedAt: new Date(),
                    approvedBy: adminId,
                    ...(claimed.company ? { company: claimed.company } : {}),
                    isCompanyOwner: claimed.isCompanyOwner,
                },
                $unset: {
                    rejectedAt: 1,
                    rejectedBy: 1,
                    rejectionReason: 1,
                    approvalLock: 1,
                    approvalInProgressAt: 1,
                },
            },
            { new: true },
        );
        if (!approved) {
            return { status: 'in_progress' };
        }

        // Best-effort — an email outage must never undo an approval.
        const emailResult = await sendRegistrationEmail(approved, 'approved');
        return { status: 'approved', user: approved, emailResult };
    } catch (error) {
        await User.updateOne(
            { _id: claimed._id, approvalLock: lock },
            { $unset: { approvalLock: 1, approvalInProgressAt: 1 } },
        ).catch(() => undefined);
        throw error;
    }
}

export interface RejectOptions {
    reason?: string;
    /** Send the respectful rejection email at all (default true). */
    notifyCustomer?: boolean;
    /** Include the reason text in that email — only when the admin opted in. */
    shareReason?: boolean;
}

export async function rejectRegistration(
    userId: string,
    adminId: mongoose.Types.ObjectId | string | undefined,
    options: RejectOptions = {},
): Promise<RejectOutcome> {
    const reason = options.reason?.trim().slice(0, 1000) || undefined;
    const now = new Date();

    const claimed = await User.findOneAndUpdate(
        {
            _id: userId,
            role: 'customer',
            isDeleted: { $ne: true },
            registrationStatus: 'pending',
            // Symmetric mutual exclusion with the registration-email retry.
            $and: [approvalLockFreeFilter(now), registrationRetryLeaseFreeFilter(now)],
        },
        {
            $set: {
                registrationStatus: 'rejected',
                isActive: false,
                rejectedAt: new Date(),
                rejectedBy: adminId,
                ...(reason ? { rejectionReason: reason } : {}),
                // Persist the sharing DECISION so a later retry repeats it
                // exactly — never silently adds or omits the reason.
                rejectionReasonShared: options.shareReason === true,
            },
            $unset: { approvalLock: 1, approvalInProgressAt: 1 },
            // Defense in depth: invalidate any token that may somehow exist.
            $inc: { tokenVersion: 1 },
        },
        { new: true },
    );

    if (!claimed) {
        const existing = await User.findOne({ _id: userId, role: 'customer', isDeleted: { $ne: true } });
        if (!existing) return { status: 'not_found' };
        if (existing.registrationStatus === 'pending') return { status: 'in_progress' };
        if (existing.registrationStatus === 'rejected') {
            return { status: 'already_rejected', user: existing };
        }
        // An approved account is deactivated through user management — a
        // registration "reject" no longer applies to it.
        return { status: 'approved_cannot_reject' };
    }

    let emailResult: SendEmailResult | undefined;
    if (options.notifyCustomer !== false) {
        emailResult = await sendRegistrationEmail(claimed, 'rejected', {
            reason: options.shareReason ? reason : undefined,
        });
    }

    return { status: 'rejected', user: claimed, emailResult };
}
