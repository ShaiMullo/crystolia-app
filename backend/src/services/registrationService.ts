// ===============================================
// Registration Approval / Rejection Service
// ===============================================
// Owns the state machine of a business-registration request:
//
//   pending ──approve──▶ approved      (Company created from the snapshot)
//   pending ──reject───▶ rejected      (reversible via approve)
//
// Both transitions are claimed with an ATOMIC findOneAndUpdate on
// registrationStatus, so a double-clicked approval can never send two emails
// or mutate data twice — the second request observes the final state and
// reports it as already done.

import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import Company from '../models/Company.js';
import { sendRegistrationEmail } from './registrationNotificationService.js';
import type { SendEmailResult } from './emailService.js';

export type ApproveOutcome =
    | { status: 'approved'; user: IUser; emailResult: SendEmailResult }
    | { status: 'already_approved'; user: IUser }
    | { status: 'conflict'; conflictField: string }
    | { status: 'not_found' };

export type RejectOutcome =
    | { status: 'rejected'; user: IUser; emailResult?: SendEmailResult }
    | { status: 'already_rejected'; user: IUser }
    | { status: 'approved_cannot_reject' }
    | { status: 'not_found' };

/**
 * Create the Company from the registration snapshot and link it, if the user
 * does not already have one. Conflicts (duplicate name / VAT) are reported —
 * never silently merged into an existing company.
 * The caller is responsible for saving the user afterwards.
 */
export async function ensureCompanyFromSnapshot(
    user: IUser,
): Promise<{ ok: true } | { ok: false; conflictField: string }> {
    if (user.company || !user.registrationCompany) return { ok: true };
    const snapshot = user.registrationCompany;

    // Pre-check for a clear admin-facing message (the unique indexes below
    // remain the authoritative guard against races).
    const [nameTaken, vatTaken] = await Promise.all([
        Company.findOne({ name: snapshot.name }).select('_id').lean(),
        Company.findOne({ vatNumber: snapshot.vatNumber }).select('_id').lean(),
    ]);
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
    // Atomically claim the transition — only one request can win it.
    const claimed = await User.findOneAndUpdate(
        {
            _id: userId,
            role: 'customer',
            isDeleted: { $ne: true },
            registrationStatus: { $in: ['pending', 'rejected'] },
        },
        {
            $set: {
                registrationStatus: 'approved',
                isActive: true,
                approvedAt: new Date(),
                approvedBy: adminId,
            },
            $unset: { rejectedAt: 1, rejectedBy: 1, rejectionReason: 1 },
        },
        { new: true },
    );

    if (!claimed) {
        const existing = await User.findOne({ _id: userId, role: 'customer', isDeleted: { $ne: true } });
        if (existing && existing.registrationStatus === 'approved') {
            return { status: 'already_approved', user: existing };
        }
        return { status: 'not_found' };
    }

    // Create the Company from the registration snapshot. Legacy pending users
    // (created before this flow) already carry a linked company and skip this.
    const companyResult = await ensureCompanyFromSnapshot(claimed);
    if (!companyResult.ok) {
        // Roll the claim back so the request stays visible as pending and the
        // admin can resolve the conflict manually.
        await User.updateOne(
            { _id: claimed._id },
            {
                $set: { registrationStatus: 'pending', isActive: false },
                $unset: { approvedAt: 1, approvedBy: 1 },
            },
        );
        return { status: 'conflict', conflictField: companyResult.conflictField };
    }
    await claimed.save({ validateBeforeSave: false });

    // Best-effort — an email outage must never undo an approval.
    const emailResult = await sendRegistrationEmail(claimed, 'approved');
    return { status: 'approved', user: claimed, emailResult };
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

    const claimed = await User.findOneAndUpdate(
        {
            _id: userId,
            role: 'customer',
            isDeleted: { $ne: true },
            registrationStatus: 'pending',
        },
        {
            $set: {
                registrationStatus: 'rejected',
                isActive: false,
                rejectedAt: new Date(),
                rejectedBy: adminId,
                ...(reason ? { rejectionReason: reason } : {}),
            },
            // Defense in depth: invalidate any token that may somehow exist.
            $inc: { tokenVersion: 1 },
        },
        { new: true },
    );

    if (!claimed) {
        const existing = await User.findOne({ _id: userId, role: 'customer', isDeleted: { $ne: true } });
        if (!existing) return { status: 'not_found' };
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
