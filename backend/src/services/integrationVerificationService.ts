// ===============================================
// ✅ Integration verification (owner-triggered)
// ===============================================
// The go-live screen must never report "verified" from credential presence
// alone. This service performs the owner's explicit verification actions —
// one real test email (to the requesting admin's own address) or one real
// admin SMS (to the configured admin recipient) — and records a sanitized
// outcome. Google OAuth is verified passively: a real completed sign-in
// flow records success (no message is ever sent for it).
//
// Abuse/concurrency: each key carries a lockedUntil lease taken atomically
// before the provider call; a second click inside the window gets 429 and
// no message is sent. Nothing stored or returned ever includes recipients,
// credentials, or raw provider responses.

import type mongoose from 'mongoose';
import IntegrationVerification, {
    type IIntegrationVerification,
    type IntegrationFailureCategory,
    type IntegrationKey,
} from '../models/IntegrationVerification.js';
import { isEmailConfigured, sendEmail } from './emailService.js';
import { isSmsTransportConfigured, sendSms } from './smsService.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/validation.js';

/** How long a successful verification is trusted before readiness reports
 *  it as expired and asks the owner to re-verify. */
export const VERIFICATION_TTL_DAYS = 30;

/** Minimum spacing between attempts per integration (also the click lock). */
const ATTEMPT_LOCK_MS = 60 * 1000;

export type VerifiableIntegrationKey = Extract<IntegrationKey, 'operational_email' | 'admin_sms'>;

export interface VerificationAttemptOutcome {
    key: IntegrationKey;
    result: 'success' | 'failed';
    failureCategory?: IntegrationFailureCategory;
    provider?: string;
    attemptedAt: string;
}

function categorizeFailure(error: string | undefined): IntegrationFailureCategory {
    const text = String(error || '');
    if (/configuration missing/i.test(text)) return 'configuration_missing';
    if (/\(\d{3}\)/.test(text)) return 'provider_rejected';
    if (/network|timeout|ECONN|ETIMEDOUT/i.test(text)) return 'network';
    return 'unknown';
}

/**
 * Take the per-key attempt lock atomically. A concurrent attempt — including
 * a double-click racing the upsert of a brand-new document — surfaces as
 * either a no-match (lock still live) or an E11000 on the unique key index;
 * both become 429 without any provider call.
 */
async function claimAttemptLock(key: IntegrationKey, actorId: mongoose.Types.ObjectId): Promise<void> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ATTEMPT_LOCK_MS);
    try {
        const claimed = await IntegrationVerification.findOneAndUpdate(
            {
                key,
                $or: [{ lockedUntil: null }, { lockedUntil: { $exists: false } }, { lockedUntil: { $lte: now } }],
            },
            {
                $set: { lockedUntil, lastAttemptAt: now, lastAttemptBy: actorId },
                $setOnInsert: { lastResult: 'failed', failureCategory: 'unknown' },
            },
            { upsert: true, new: true },
        );
        if (!claimed) throw new AppError('A verification attempt is already in progress — try again shortly', 429);
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
            throw new AppError('A verification attempt is already in progress — try again shortly', 429);
        }
        throw error;
    }
}

async function recordOutcome(
    key: IntegrationKey,
    outcome: { result: 'success' | 'failed'; failureCategory?: IntegrationFailureCategory; provider?: string },
): Promise<void> {
    const now = new Date();
    await IntegrationVerification.updateOne(
        { key },
        {
            $set: {
                lastResult: outcome.result,
                provider: outcome.provider,
                ...(outcome.result === 'success'
                    ? { verifiedAt: now }
                    : { failureCategory: outcome.failureCategory ?? 'unknown' }),
            },
            ...(outcome.result === 'success' ? { $unset: { failureCategory: '' } } : {}),
        },
    );
}

/**
 * Perform one owner-triggered verification attempt. Sends exactly one real
 * message on the owner's explicit request; the caller (route) is responsible
 * for authentication, authorization and audit logging.
 */
export async function verifyIntegration(
    key: VerifiableIntegrationKey,
    actor: { _id: mongoose.Types.ObjectId; email?: string },
): Promise<VerificationAttemptOutcome> {
    await claimAttemptLock(key, actor._id);
    const attemptedAt = new Date().toISOString();

    if (key === 'operational_email') {
        const provider = config.email.provider === 'twilio' ? 'twilio-email' : 'sendgrid';
        if (!isEmailConfigured() || !actor.email) {
            await recordOutcome(key, { result: 'failed', failureCategory: 'configuration_missing', provider });
            return { key, result: 'failed', failureCategory: 'configuration_missing', provider, attemptedAt };
        }
        // Test message goes to the requesting admin's OWN account address —
        // never to customers, never to an arbitrary input.
        const sent = await sendEmail(
            actor.email,
            'Crystolia — בדיקת מערכת דוא"ל תפעולית / operational email verification',
            {
                text: 'הודעת אימות תפעולית ממערכת Crystolia. קבלת ההודעה מאשרת שערוץ הדוא"ל פעיל.\n\n'
                    + 'This is an operational verification message from the Crystolia system. Receiving it confirms the email channel works.',
                html: '<p>הודעת אימות תפעולית ממערכת Crystolia. קבלת ההודעה מאשרת שערוץ הדוא"ל פעיל.</p>'
                    + '<p>This is an operational verification message from the Crystolia system. Receiving it confirms the email channel works.</p>',
            },
        );
        const outcome: VerificationAttemptOutcome = sent.success
            ? { key, result: 'success', provider, attemptedAt }
            : { key, result: 'failed', failureCategory: categorizeFailure(sent.error), provider, attemptedAt };
        await recordOutcome(key, outcome);
        return outcome;
    }

    // admin_sms — the configured administrator recipient, never a free-form number.
    const provider = 'twilio-sms';
    if (!isSmsTransportConfigured() || !config.adminPhone) {
        await recordOutcome(key, { result: 'failed', failureCategory: 'configuration_missing', provider });
        return { key, result: 'failed', failureCategory: 'configuration_missing', provider, attemptedAt };
    }
    const sent = await sendSms(
        config.adminPhone,
        'Crystolia: הודעת אימות תפעולית. קבלת ההודעה מאשרת שערוץ ה-SMS למנהל פעיל.',
    );
    const outcome: VerificationAttemptOutcome = sent.success
        ? { key, result: 'success', provider, attemptedAt }
        : { key, result: 'failed', failureCategory: categorizeFailure(sent.error), provider, attemptedAt };
    await recordOutcome(key, outcome);
    return outcome;
}

/**
 * Passive evidence for Google OAuth: called from the auth callback after a
 * REAL sign-in completed end-to-end. Best-effort — a recording failure must
 * never break the login itself.
 */
export async function recordGoogleOauthSuccess(): Promise<void> {
    try {
        const now = new Date();
        await IntegrationVerification.updateOne(
            { key: 'google_oauth' },
            {
                $set: {
                    provider: 'google',
                    lastAttemptAt: now,
                    lastResult: 'success',
                    verifiedAt: now,
                },
                $unset: { failureCategory: '' },
            },
            { upsert: true },
        );
    } catch (error) {
        console.warn('[IntegrationVerification] Failed to record Google OAuth success:',
            error instanceof Error ? error.message : 'unknown');
    }
}

export type StoredVerification = Pick<
    IIntegrationVerification,
    'key' | 'provider' | 'lastAttemptAt' | 'lastResult' | 'failureCategory' | 'verifiedAt'
>;

/** Sanitized per-key verification records for readiness reporting. */
export async function getIntegrationVerifications(): Promise<Partial<Record<IntegrationKey, StoredVerification>>> {
    const rows = await IntegrationVerification.find({})
        .select('key provider lastAttemptAt lastResult failureCategory verifiedAt')
        .lean();
    const byKey: Partial<Record<IntegrationKey, StoredVerification>> = {};
    for (const row of rows) byKey[row.key] = row;
    return byKey;
}

export function isVerificationExpired(verifiedAt: Date | undefined, now = new Date()): boolean {
    if (!verifiedAt) return true;
    return now.getTime() - new Date(verifiedAt).getTime() > VERIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000;
}
