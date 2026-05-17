// ===============================================
// 📋 Audit Log Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface IAuditLog extends Document {
    action: string;      // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    entity: string;      // e.g., 'Lead', 'User'
    entityId: string;    // ID of the affected entity
    performedBy: string; // ID of the user who performed the action
    details?: Record<string, any>; // Changed fields, old/new values
    ipAddress?: string;
    userAgent?: string;

    // Phase 8 audit hardening (all additive).
    severity: AuditSeverity;
    correlationId?: string;          // ties together logs from one request
    actorSnapshot?: { name?: string; email?: string; role?: string };
    entitySnapshot?: Record<string, unknown>;

    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: {
            type: String,
            required: true,
            uppercase: true,
        },
        entity: {
            type: String,
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
        performedBy: {
            type: String,
            required: true,
            ref: 'User',
        },
        details: {
            type: Schema.Types.Mixed,
        },
        ipAddress: String,
        userAgent: String,
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical'],
            default: 'info',
            index: true,
        },
        correlationId: { type: String, index: true },
        actorSnapshot: {
            name: String,
            email: String,
            role: String,
        },
        entitySnapshot: { type: Schema.Types.Mixed },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only createdAt needed
    }
);

// Index for quick queries by entity or user
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

// ━━ Immutability guard ━━
// Audit entries are append-only. Block any modification of a saved doc
// and any document-update query at the model level.
AuditLogSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('Audit entries are immutable'));
    }
    next();
});
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'] as const) {
    AuditLogSchema.pre(op, function (next) {
        next(new Error('Audit entries are immutable'));
    });
}

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
