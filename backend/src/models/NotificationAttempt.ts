// ===============================================
// 📨 Notification delivery attempt (durable lease)
// ===============================================
// One document per admin-triggered notification retry. Created and
// persisted BEFORE any provider call, so a crash mid-send leaves an
// in_progress record that later resolves to an explicit `unknown` state —
// the system never silently resends a delivery it cannot account for.
//
// Privacy contract: outcomes, sanitized error CATEGORIES and provider
// message ids only. Never recipient addresses/phones, message bodies,
// credentials, or raw provider responses.

import mongoose, { Document, Schema } from 'mongoose';

export type AttemptOutcome = 'sent' | 'failed' | 'skipped';

export interface IChannelResult {
    outcome: AttemptOutcome;
    /** Sanitized category — never the raw provider error text. */
    errorCategory?: string;
    /** Provider message id when the provider returns one (SMS does). */
    providerMessageId?: string;
}

export interface INotificationAttempt extends Document {
    order: mongoose.Types.ObjectId;
    /** Order status this attempt notifies about — a claim is only valid
     *  while the order still has this status. */
    forStatus: string;
    /** Unique lease token; a stale process can never finalize a newer attempt. */
    attemptId: string;
    channels: string[];
    status: 'in_progress' | 'completed' | 'unknown';
    results?: {
        email?: IChannelResult;
        sms?: IChannelResult;
    };
    actorId?: string;
    startedAt: Date;
    finishedAt?: Date;
}

const ChannelResultSchema = new Schema<IChannelResult>(
    {
        outcome: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
        errorCategory: { type: String, maxlength: 40 },
        providerMessageId: { type: String, maxlength: 80 },
    },
    { _id: false },
);

const NotificationAttemptSchema = new Schema<INotificationAttempt>(
    {
        order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        forStatus: { type: String, required: true },
        attemptId: { type: String, required: true, unique: true },
        channels: { type: [String], required: true },
        status: { type: String, enum: ['in_progress', 'completed', 'unknown'], required: true, index: true },
        results: {
            type: new Schema({ email: ChannelResultSchema, sms: ChannelResultSchema }, { _id: false }),
        },
        actorId: { type: String },
        startedAt: { type: Date, required: true },
        finishedAt: { type: Date },
    },
    { timestamps: true },
);

// At most ONE live attempt per order — creating the in_progress document is
// itself the durable half of the claim.
NotificationAttemptSchema.index(
    { order: 1 },
    { unique: true, partialFilterExpression: { status: 'in_progress' }, name: 'one_in_progress_per_order' },
);

export const NotificationAttempt = mongoose.model<INotificationAttempt>('NotificationAttempt', NotificationAttemptSchema);
export default NotificationAttempt;
