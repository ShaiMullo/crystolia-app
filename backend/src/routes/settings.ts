// ===============================================
// ⚙️ Settings Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/settings - Get business settings
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await Settings.findOne({ key: 'business' }).lean();

        if (!settings) {
            // No document written yet — return hardcoded defaults so the
            // frontend always gets a valid shape before the first admin save.
            return res.json({
                success: true,
                data: {
                    key: 'business',
                    minimumOrderAmount: 0,
                    boxPrices: [],
                    currency: 'ILS',
                },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUT /api/settings - Upsert business settings
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.put('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { minimumOrderAmount, boxPrices, currency } = req.body;

        if (minimumOrderAmount !== undefined && (typeof minimumOrderAmount !== 'number' || minimumOrderAmount < 0)) {
            throw new AppError('minimumOrderAmount must be a non-negative number', 400);
        }

        const update: Record<string, any> = {
            updatedBy: req.user?._id,
        };

        if (minimumOrderAmount !== undefined) update.minimumOrderAmount = minimumOrderAmount;
        if (currency !== undefined) update.currency = currency;
        if (boxPrices !== undefined) {
            if (!Array.isArray(boxPrices)) {
                throw new AppError('boxPrices must be an array', 400);
            }
            update.boxPrices = boxPrices;
        }

        const settings = await Settings.findOneAndUpdate(
            { key: 'business' },
            { $set: update },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        await logAudit({
            action: 'UPDATE',
            entity: 'Settings',
            entityId: 'business',
            req,
            details: { updatedFields: Object.keys(update).filter(k => k !== 'updatedBy') },
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
});

export default router;
