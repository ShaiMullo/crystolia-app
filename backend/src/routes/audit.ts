// ===============================================
// 📋 Audit Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/audit - Get audit logs
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        // Optional filtering — e.g. ?entity=User&entityId=<id> for one user's
        // activity timeline. No params → all logs (unchanged behavior).
        const filter: Record<string, unknown> = {};
        if (req.query.entity) filter.entity = req.query.entity as string;
        if (req.query.entityId) filter.entityId = req.query.entityId as string;

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('performedBy', 'name email role') // Get user details
            .lean();

        const total = await AuditLog.countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
