// ===============================================
// ✅ CRM Tasks Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Task from '../models/Task.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin', 'agent'));

const RELATED_TYPES = new Set(['Lead', 'Customer', 'Invoice', 'Order', 'None']);
const STATUSES = new Set(['open', 'in_progress', 'done', 'cancelled']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

// ━━ GET /api/crm/tasks
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

        const filter: Record<string, unknown> = { isDeleted: false };
        if (typeof req.query.status === 'string' && STATUSES.has(req.query.status)) filter.status = req.query.status;
        if (typeof req.query.priority === 'string' && PRIORITIES.has(req.query.priority)) filter.priority = req.query.priority;
        if (typeof req.query.assignedTo === 'string') {
            if (req.query.assignedTo === 'me') filter.assignedTo = req.user?._id;
            else if (validate.objectId(req.query.assignedTo)) filter.assignedTo = req.query.assignedTo;
        }
        if (typeof req.query.relatedType === 'string' && RELATED_TYPES.has(req.query.relatedType)) {
            filter.relatedType = req.query.relatedType;
        }
        if (typeof req.query.relatedId === 'string' && validate.objectId(req.query.relatedId)) {
            filter.relatedId = req.query.relatedId;
        }
        if (req.query.overdue === 'true') {
            filter.status = filter.status || { $in: ['open', 'in_progress'] };
            filter.dueAt = { $lt: new Date() };
        }

        const [tasks, total] = await Promise.all([
            Task.find(filter)
                .sort({ dueAt: 1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('assignedTo', 'name email role')
                .populate('createdBy', 'name email')
                .lean(),
            Task.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: tasks,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/tasks/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Task ID', 400);
        const task = await Task.findOne({ _id: req.params.id, isDeleted: false })
            .populate('assignedTo', 'name email role')
            .populate('createdBy', 'name email')
            .lean();
        if (!task) throw new AppError('Task not found', 404);
        res.json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/tasks
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        if (!body.title || typeof body.title !== 'string') throw new AppError('title is required', 400);

        const task = await Task.create({
            title: body.title.trim(),
            description: typeof body.description === 'string' ? body.description.trim() : undefined,
            priority: PRIORITIES.has(body.priority) ? body.priority : 'normal',
            status: STATUSES.has(body.status) ? body.status : 'open',
            dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
            assignedTo: typeof body.assignedTo === 'string' && validate.objectId(body.assignedTo)
                ? body.assignedTo : req.user?._id,
            relatedType: RELATED_TYPES.has(body.relatedType) ? body.relatedType : 'None',
            relatedId: typeof body.relatedId === 'string' && validate.objectId(body.relatedId) ? body.relatedId : undefined,
            relatedLabel: typeof body.relatedLabel === 'string' ? body.relatedLabel.trim() : undefined,
            createdBy: req.user?._id,
        });

        await logAudit({ action: 'CREATE', entity: 'Task', entityId: task._id.toString(), req, details: { title: task.title } });
        res.status(201).json({ success: true, data: task.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/tasks/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Task ID', 400);
        const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
        if (!task) throw new AppError('Task not found', 404);

        const body = req.body || {};

        if (typeof body.title === 'string') task.title = body.title.trim();
        if (typeof body.description === 'string') task.description = body.description.trim();
        if (typeof body.priority === 'string' && PRIORITIES.has(body.priority)) task.priority = body.priority as typeof task.priority;
        if (body.dueAt) task.dueAt = new Date(body.dueAt);
        if (typeof body.assignedTo === 'string') {
            if (body.assignedTo && validate.objectId(body.assignedTo)) {
                task.assignedTo = body.assignedTo as unknown as typeof task.assignedTo;
            }
        }
        if (typeof body.status === 'string' && STATUSES.has(body.status)) {
            task.status = body.status as typeof task.status;
            if (body.status === 'done' && !task.completedAt) task.completedAt = new Date();
        }

        await task.save();
        await logAudit({ action: 'UPDATE', entity: 'Task', entityId: task._id.toString(), req, details: { status: task.status } });
        res.json({ success: true, data: task.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ DELETE /api/crm/tasks/:id (soft)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Task ID', 400);
        const task = await Task.findOne({ _id: req.params.id, isDeleted: false });
        if (!task) throw new AppError('Task not found', 404);
        task.isDeleted = true;
        await task.save();
        await logAudit({ action: 'DELETE', entity: 'Task', entityId: task._id.toString(), req });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
