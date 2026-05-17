// ===============================================
// 🕵️ Audit Service
// ===============================================
// Writes immutable audit entries. Phase 8 adds actor snapshots,
// request correlation IDs and severity — all optional and additive,
// so every existing caller keeps working unchanged.

import AuditLog, { AuditSeverity } from '../models/AuditLog.js';
import { Request } from 'express';

interface AuditParams {
    action: string;
    entity: string;
    entityId: string;
    req: Request;
    details?: Record<string, any>;
    severity?: AuditSeverity;
    entitySnapshot?: Record<string, unknown>;
}

// DELETE actions default to warning severity; everything else is info.
function defaultSeverity(action: string): AuditSeverity {
    const a = action.toUpperCase();
    if (a === 'DELETE') return 'warning';
    return 'info';
}

export const logAudit = async ({ action, entity, entityId, req, details, severity, entitySnapshot }: AuditParams) => {
    try {
        const userId = req.user?._id?.toString() || 'SYSTEM';
        const actor = req.user as { name?: string; email?: string; role?: string } | undefined;

        await AuditLog.create({
            action,
            entity,
            entityId,
            performedBy: userId,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            severity: severity || defaultSeverity(action),
            correlationId: (req as Request & { requestId?: string }).requestId,
            actorSnapshot: actor
                ? { name: actor.name, email: actor.email, role: actor.role }
                : undefined,
            entitySnapshot,
        });
    } catch (error) {
        // Audit logging must never break the main flow.
        console.error('❌ Failed to create audit log:', error);
    }
};
