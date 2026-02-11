// ===============================================
// 📋 Audit Log Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;      // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
    entity: string;      // e.g., 'Lead', 'User'
    entityId: string;    // ID of the affected entity
    performedBy: string; // ID of the user who performed the action
    details?: Record<string, any>; // Changed fields, old/new values
    ipAddress?: string;
    userAgent?: string;
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
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Only createdAt needed
    }
);

// Index for quick queries by entity or user
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
