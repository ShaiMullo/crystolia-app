// ===============================================
// ✅ Integration Verification Model
// ===============================================
// One document per verifiable integration, recording the outcome of the
// owner's explicit verification action (or, for Google OAuth, a real
// completed sign-in flow). STRICTLY sanitized: no credentials, tokens,
// recipient addresses/numbers, or raw provider responses are ever stored —
// only timestamps, actor id, provider name and a coarse failure category.

import mongoose, { Document, Schema } from 'mongoose';

export const INTEGRATION_KEYS = ['operational_email', 'admin_sms', 'google_oauth'] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export function isIntegrationKey(value: unknown): value is IntegrationKey {
    return typeof value === 'string' && (INTEGRATION_KEYS as readonly string[]).includes(value);
}

export type IntegrationFailureCategory =
    | 'configuration_missing'
    | 'provider_rejected'
    | 'network'
    | 'unknown';

export interface IIntegrationVerification extends Document {
    key: IntegrationKey;
    provider?: string;
    lastAttemptAt: Date;
    lastAttemptBy?: mongoose.Types.ObjectId;
    lastResult: 'success' | 'failed';
    failureCategory?: IntegrationFailureCategory;
    /** Set only on success; readiness treats old timestamps as expired. */
    verifiedAt?: Date;
    /** Concurrency/abuse guard: attempts are refused while a lock is live. */
    lockedUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const IntegrationVerificationSchema = new Schema<IIntegrationVerification>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            enum: INTEGRATION_KEYS,
        },
        provider: { type: String, trim: true, maxlength: 40 },
        lastAttemptAt: { type: Date, required: true },
        lastAttemptBy: { type: Schema.Types.ObjectId, ref: 'User' },
        lastResult: { type: String, required: true, enum: ['success', 'failed'] },
        failureCategory: {
            type: String,
            enum: ['configuration_missing', 'provider_rejected', 'network', 'unknown'],
        },
        verifiedAt: { type: Date },
        lockedUntil: { type: Date },
    },
    { timestamps: true }
);

export const IntegrationVerification = mongoose.model<IIntegrationVerification>(
    'IntegrationVerification',
    IntegrationVerificationSchema,
);
export default IntegrationVerification;
