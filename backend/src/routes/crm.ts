// ===============================================
// 📊 CRM API Routes
// ===============================================
// Additive CRM endpoints — does NOT replace /api/leads
// All routes are protected and admin-only

import { Router, Request, Response, NextFunction } from 'express';
import Lead, { LeadStatus } from '../models/Lead.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// All CRM routes require admin auth
router.use(protect);
router.use(authorize('admin'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/leads - Filtered CRM lead list
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/leads', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const query: Record<string, unknown> = { isDeleted: false };

        // Filters
        if (req.query.status) query.status = req.query.status;
        if (req.query.ownerId) query.ownerId = req.query.ownerId;
        if (req.query.source) query.source = req.query.source;
        if (req.query.tags) query.tags = { $in: (req.query.tags as string).split(',') };

        // Date range
        if (req.query.from || req.query.to) {
            const dateFilter: Record<string, Date> = {};
            if (req.query.from) dateFilter.$gte = new Date(req.query.from as string);
            if (req.query.to) dateFilter.$lte = new Date(req.query.to as string);
            query.createdAt = dateFilter;
        }

        // Search
        if (req.query.search) {
            query.$text = { $search: req.query.search as string };
        }

        // Sort
        const sortField = (req.query.sortBy as string) || 'lastContactAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .sort({ [sortField]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Lead.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                leads,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/leads/:id - Full lead detail
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/status - Change status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { status } = req.body;
        const validStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'converted', 'closed', 'archived', 're-engaged'];

        if (!status || !validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Valid: ${validStatuses.join(', ')}`, 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        const oldStatus = lead.status;
        lead.status = status;
        lead.timeline.push({
            type: 'status_changed',
            at: new Date(),
            actorId: req.user?._id?.toString(),
            meta: { from: oldStatus, to: status },
        });

        await lead.save();

        // Audit
        if (req.user) {
            await logAudit({
                action: 'UPDATE',
                entity: 'Lead',
                entityId: lead._id.toString(),
                req,
                details: { statusChange: { from: oldStatus, to: status } },
            });
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/crm/leads/:id/notes - Add note
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/leads/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new AppError('Note text is required', 400);
        }

        const now = new Date();
        const actorId = req.user?._id?.toString();

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $push: {
                    notes: { text: text.trim(), createdAt: now, actorId },
                    timeline: { type: 'note_added', at: now, actorId, meta: { preview: text.trim().substring(0, 50) } },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/assign - Assign owner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { ownerId } = req.body;
        // ownerId can be a userId string or empty to unassign

        const now = new Date();
        const actorId = req.user?._id?.toString();

        const updateData: Record<string, unknown> = {
            ownerId: ownerId || null,
            assignedTo: ownerId || null,
        };

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $set: updateData,
                $push: {
                    timeline: {
                        type: 'owner_assigned',
                        at: now,
                        actorId,
                        meta: { ownerId: ownerId || 'unassigned' },
                    },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/onboarding - Update onboarding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/onboarding', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { currentStep, completed, data } = req.body;

        const updateFields: Record<string, unknown> = {};
        if (currentStep !== undefined) updateFields['onboarding.currentStep'] = currentStep;
        if (completed !== undefined) {
            updateFields['onboarding.completed'] = completed;
            if (completed) updateFields['onboarding.completedAt'] = new Date();
        }
        if (data) {
            // Merge data into existing onboarding.data
            for (const [key, value] of Object.entries(data)) {
                updateFields[`onboarding.data.${key}`] = value;
            }
        }

        const now = new Date();

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $set: updateFields,
                $push: {
                    timeline: {
                        type: 'onboarding_step_completed',
                        at: now,
                        meta: { step: currentStep, completed: !!completed },
                    },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

export default router;
