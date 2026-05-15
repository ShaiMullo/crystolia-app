// ===============================================
// 🔔 CRM Notifications Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';

const router = Router();
router.use(protect);
router.use(authorize('admin', 'agent'));

// ━━ GET /api/crm/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

        const filter: Record<string, unknown> = { recipient: req.user?._id };
        if (req.query.unread === 'true') filter.isRead = false;

        const [items, total, unread] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient: req.user?._id, isRead: false }),
        ]);

        res.json({
            success: true,
            data: items,
            unreadCount: unread,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/notifications/:id/read
router.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Notification ID', 400);
        const notif = await Notification.findOne({ _id: req.params.id, recipient: req.user?._id });
        if (!notif) throw new AppError('Notification not found', 404);
        if (!notif.isRead) {
            notif.isRead = true;
            notif.readAt = new Date();
            await notif.save();
        }
        res.json({ success: true, data: notif.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/notifications/read-all
router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Notification.updateMany(
            { recipient: req.user?._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } },
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
