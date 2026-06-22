// ===============================================
// 🚨 IntegrationErrorLog Model (generic, vendor-agnostic)
// ===============================================
// Durable record of integration failures and dead-lettered sync jobs, so they
// can be inspected, retried, and resolved. Distinct from IntegrationLog (which
// is high-volume operational logging) — this is the low-volume "needs attention"
// queue.
//
// Additive & inert: not written to by any runtime code yet.

import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationErrorLog extends Document {
    provider: string;             // e.g. 'comax'
    entity?: string;              // 'orders' | 'products' | …
    operation?: string;           // 'syncOrders' | 'connect' | …
    /** External record id involved, if known. */
    externalId?: string;
    message: string;
    code?: string;
    stack?: string;
    /** Raw payload / job that failed — kept verbatim for debugging. */
    payload?: unknown;
    correlationId?: string;
    /** Was this routed through the dead-letter path? */
    deadLettered: boolean;
    retryCount: number;
    resolved: boolean;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const IntegrationErrorLogSchema = new Schema<IIntegrationErrorLog>(
    {
        provider: { type: String, required: true, trim: true, index: true },
        entity: { type: String, trim: true, index: true },
        operation: { type: String, trim: true },
        externalId: { type: String, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 4000 },
        code: { type: String, trim: true },
        stack: { type: String },
        payload: { type: Schema.Types.Mixed },
        correlationId: { type: String, trim: true, index: true },
        deadLettered: { type: Boolean, default: false, index: true },
        retryCount: { type: Number, default: 0, min: 0 },
        resolved: { type: Boolean, default: false, index: true },
        resolvedAt: { type: Date },
    },
    { timestamps: true },
);

IntegrationErrorLogSchema.index({ provider: 1, resolved: 1, createdAt: -1 });

export const IntegrationErrorLog = mongoose.model<IIntegrationErrorLog>(
    'IntegrationErrorLog',
    IntegrationErrorLogSchema,
);
export default IntegrationErrorLog;
