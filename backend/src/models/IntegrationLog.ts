// ===============================================
// 🧾 IntegrationLog Model (generic, vendor-agnostic)
// ===============================================
// Append-only operational log for ANY external integration (ERP, payment,
// shipping, …). Captures granular events during connect/sync/health operations.
//
// Additive & inert: this model is not yet written to by any runtime code. It
// exists so the future SyncEngine / connectors have a place to record activity.

import mongoose, { Document, Schema } from 'mongoose';

export type IntegrationLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface IIntegrationLog extends Document {
    /** Source system, e.g. 'comax'. Generic on purpose. */
    provider: string;
    level: IntegrationLogLevel;
    /** Operation name, e.g. 'connect', 'syncProducts', 'healthCheck'. */
    operation?: string;
    /** Domain entity touched, e.g. 'products'. */
    entity?: string;
    message: string;
    /** Correlates all log lines belonging to one run. */
    correlationId?: string;
    /** Arbitrary structured context (never parsed for business logic). */
    context?: Record<string, unknown>;
    createdAt: Date;
}

const IntegrationLogSchema = new Schema<IIntegrationLog>(
    {
        provider: { type: String, required: true, trim: true, index: true },
        level: {
            type: String,
            enum: ['debug', 'info', 'warn', 'error'],
            default: 'info',
            index: true,
        },
        operation: { type: String, trim: true },
        entity: { type: String, trim: true, index: true },
        message: { type: String, required: true, trim: true, maxlength: 4000 },
        correlationId: { type: String, trim: true, index: true },
        context: { type: Schema.Types.Mixed },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

IntegrationLogSchema.index({ provider: 1, createdAt: -1 });

export const IntegrationLog = mongoose.model<IIntegrationLog>(
    'IntegrationLog',
    IntegrationLogSchema,
);
export default IntegrationLog;
