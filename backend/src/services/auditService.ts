// ===============================================
// 🕵️ Audit Service
// ===============================================

import AuditLog from '../models/AuditLog.js';
import { Request } from 'express';

interface AuditParams {
    action: string;
    entity: string;
    entityId: string;
    req: Request;
    details?: Record<string, any>;
}

export const logAudit = async ({ action, entity, entityId, req, details }: AuditParams) => {
    try {
        // If system action (no user), we might want to handle differently
        // But for now, we assume authenticated requests
        const userId = req.user?._id?.toString() || 'SYSTEM';

        await AuditLog.create({
            action,
            entity,
            entityId,
            performedBy: userId,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    } catch (error) {
        // We don't want audit logging to break the main flow, so we just log the error
        console.error('❌ Failed to create audit log:', error);
    }
};
