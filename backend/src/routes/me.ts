// ===============================================
// 🙋 /api/v1/me — Customer Portal (self-service) Routes
// ===============================================
// The authenticated customer's OWN resources. These are additive aliases that
// reuse the EXACT same handler functions as the legacy /api/customers/* and
// customer-facing /api/orders routes — same logic, same response shapes, no
// drift. The legacy routes stay mounted and unchanged (see routes/customers.ts,
// routes/orders.ts). See docs/b4-customer-facing-v1-plan.md.
//
// Note: /api/v1/customers and /api/v1/orders remain the ADMIN CRM routers
// (routes/crmCustomers.ts / routes/crmOrders.ts) — this /me namespace is the
// separate customer-facing surface and does not touch them.

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getMyProfile, completeProfile, updateProfile } from './customers.js';
import { placeOrder, listOrders } from './orders.js';
import User from '../models/User.js';
import { AppError } from '../utils/validation.js';
import { normalizeUploadedAvatar } from '../utils/avatar.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// Protect ALL routes (same as the legacy routers).
router.use(protect);

// ── Customer profile (self-service) ──────────────────────────────────────────
router.get('/profile', authorize('customer'), getMyProfile);            // ← GET /api/customers/my-profile
router.post('/profile/complete', authorize('customer'), completeProfile); // ← POST /api/customers/complete-profile
router.patch('/profile', authorize('customer'), updateProfile);         // ← PATCH /api/customers/update-profile

// PATCH /api/v1/me/avatar — persist the customer's compressed profile image.
// The client resizes before upload, while the backend independently validates
// the MIME type, decoded size and binary signature before storing anything.
router.patch('/avatar', authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const avatar = normalizeUploadedAvatar(req.body?.avatar);
        if (!avatar) {
            return next(new AppError('Avatar must be a JPEG, PNG or WebP image up to 256 KB', 400));
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { avatar } },
            { new: true, runValidators: true },
        ).select('avatar');

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: String(user._id),
            req,
            details: { field: 'avatar' },
        });

        res.json({ success: true, data: { avatar: user.avatar } });
    } catch (error) {
        next(error);
    }
});

// ── Customer orders (own only) ───────────────────────────────────────────────
// listOrders is role-aware; gating to 'customer' keeps /me/orders scoped to the
// caller's own company (POST mirrors the legacy customer-only placement).
router.post('/orders', authorize('customer'), placeOrder);              // ← POST /api/orders
router.get('/orders', authorize('customer'), listOrders);               // ← GET /api/orders (customer-scoped)

export default router;
