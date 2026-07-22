// ===============================================
// 🩺 CRM System Routes — health, jobs, backups, audit, diagnostics
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import ScheduledJob from '../models/ScheduledJob.js';
import JobRun from '../models/JobRun.js';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import AuditLog from '../models/AuditLog.js';
import BackupManifest from '../models/BackupManifest.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { reconciliationStatus } from '../services/reconciliationService.js';
import { getReplicaDiagnostics } from '../services/diagnosticsService.js';
import { createBackupManifest, verifyBackupManifest, listBackupManifests } from '../services/backupService.js';
import { runJobNow, JOB_DEFINITIONS } from '../jobs/scheduler.js';
import { resetRateLimitStore } from '../middleware/rateLimit.js';
import { config } from '../config/index.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

// ━━ GET /api/crm/system/health - aggregate operational health
router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const [recon, failedJobs, lowStockRows, overdueInvoices, lastBackup, recentFailures, diagnostics] =
            await Promise.all([
                reconciliationStatus(),
                ScheduledJob.countDocuments({ lastStatus: 'failed' }),
                Inventory.find({}).populate('product', 'isDeleted stockTrackingEnabled').lean(),
                Invoice.countDocuments({ status: { $ne: 'cancelled' }, paymentStatus: { $ne: 'paid' }, dueDate: { $lt: now } }),
                BackupManifest.findOne({}).sort({ createdAt: -1 }).lean(),
                JobRun.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(5).lean(),
                getReplicaDiagnostics(),
            ]);

        const lowStockCount = lowStockRows.filter((r) => {
            const p = r.product as unknown as { isDeleted?: boolean; stockTrackingEnabled?: boolean } | null;
            if (!p || p.isDeleted || p.stockTrackingEnabled === false) return false;
            return (r.minimumQuantity || 0) > 0 && (r.quantity - r.reservedQuantity) <= r.minimumQuantity;
        }).length;

        // Overall health score blends reconciliation score with operational penalties.
        let score = recon.healthScore;
        score -= Math.min(20, failedJobs * 10);
        score -= Math.min(15, overdueInvoices > 0 ? 5 : 0);
        score = Math.max(0, Math.round(score));
        const severity = score >= 85 ? 'healthy' : score >= 50 ? 'warning' : 'critical';

        res.json({
            success: true,
            data: {
                healthScore: score,
                severity,
                reconciliation: recon,
                failedJobs,
                lowStockCount,
                overdueInvoices,
                paymentMismatchCount: recon.mismatchCount,
                lastBackup: lastBackup
                    ? { _id: lastBackup._id, status: lastBackup.status, createdAt: lastBackup.createdAt, totalDocuments: lastBackup.totalDocuments }
                    : null,
                recentFailures: recentFailures.map((f) => ({
                    jobKey: f.jobKey,
                    error: f.error,
                    createdAt: f.createdAt,
                })),
                diagnostics,
                notifications: {
                    recipientConfigured: Boolean(config.adminPhone),
                    whatsappConfigured: Boolean(config.adminPhone && config.whatsapp.instanceId && config.whatsapp.token),
                    smsConfigured: Boolean(config.adminPhone && config.sms.accountSid && config.sms.authToken && config.sms.fromNumber),
                },
                checkedAt: now.toISOString(),
            },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/system/diagnostics - replica-set / transaction support
router.get('/diagnostics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await getReplicaDiagnostics() });
    } catch (err) {
        next(err);
    }
});

// ━━ Jobs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/jobs', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const jobs = await ScheduledJob.find({}).sort({ key: 1 }).lean();
        res.json({ success: true, data: jobs, definitions: JOB_DEFINITIONS });
    } catch (err) {
        next(err);
    }
});

router.get('/jobs/:key/runs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const runs = await JobRun.find({ jobKey: req.params.key })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        res.json({ success: true, data: runs });
    } catch (err) {
        next(err);
    }
});

router.patch('/jobs/:key', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const update: Record<string, unknown> = {};
        if (typeof req.body?.enabled === 'boolean') update.enabled = req.body.enabled;
        if (typeof req.body?.intervalMs === 'number' && req.body.intervalMs >= 60000) {
            update.intervalMs = req.body.intervalMs;
        }
        const job = await ScheduledJob.findOneAndUpdate({ key: req.params.key }, { $set: update }, { new: true });
        if (!job) throw new AppError('Job not found', 404);
        await logAudit({ action: 'UPDATE', entity: 'ScheduledJob', entityId: req.params.key, req, details: update });
        res.json({ success: true, data: job.toObject() });
    } catch (err) {
        next(err);
    }
});

router.post('/jobs/:key/run', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await runJobNow(req.params.key);
        if (!result.ok && result.error === 'Unknown job') throw new AppError('Job not found', 404);
        await logAudit({ action: 'UPDATE', entity: 'ScheduledJob', entityId: req.params.key, req, details: { manualRun: true } });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// POST /rate-limit/reset — clear the in-memory rate-limit buckets (admin only).
// Lets operational tooling (e.g. the smoke suite, which deliberately exhausts
// the public-lead budget to prove the 429 path) restore a clean state without
// restarting the backend.
router.post('/rate-limit/reset', async (req: Request, res: Response, next: NextFunction) => {
    try {
        resetRateLimitStore();
        await logAudit({ action: 'UPDATE', entity: 'System', entityId: 'rate-limit', req, details: { reset: true } });
        res.json({ success: true, message: 'Rate-limit buckets cleared' });
    } catch (err) {
        next(err);
    }
});

// ━━ Backups ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/backups', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({ success: true, data: await listBackupManifests(30) });
    } catch (err) {
        next(err);
    }
});

router.post('/backups', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
        const result = await createBackupManifest(label, req.user?._id?.toString());
        await logAudit({ action: 'CREATE', entity: 'BackupManifest', entityId: result.manifestId, req, details: { label } });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

router.post('/backups/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid backup ID', 400);
        let result;
        try {
            result = await verifyBackupManifest(req.params.id);
        } catch (e) {
            const msg = (e as Error).message;
            if (msg.includes('not found')) throw new AppError(msg, 404);
            if (msg.includes('failed backup')) throw new AppError(msg, 400);
            throw e;
        }
        await logAudit({ action: 'UPDATE', entity: 'BackupManifest', entityId: req.params.id, req, details: { verified: true } });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// ━━ Audit search ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 30);

        const filter: Record<string, unknown> = {};
        if (typeof req.query.entity === 'string' && req.query.entity) filter.entity = req.query.entity;
        if (typeof req.query.action === 'string' && req.query.action) filter.action = req.query.action.toUpperCase();
        if (typeof req.query.severity === 'string' && req.query.severity) filter.severity = req.query.severity;
        if (typeof req.query.performedBy === 'string' && req.query.performedBy) filter.performedBy = req.query.performedBy;
        if (typeof req.query.entityId === 'string' && req.query.entityId) filter.entityId = req.query.entityId;
        if (req.query.from || req.query.to) {
            const range: Record<string, Date> = {};
            if (typeof req.query.from === 'string') range.$gte = new Date(req.query.from);
            if (typeof req.query.to === 'string') range.$lte = new Date(req.query.to);
            filter.createdAt = range;
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('performedBy', 'name email role')
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
