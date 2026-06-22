// ===============================================
// 👥 Users Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { generateTempPassword } from '../utils/password.js';

const router = Router();

// Count admins who can still log in — used by the last-active-admin guards.
async function activeAdminCount(): Promise<number> {
    return User.countDocuments({ role: 'admin', isActive: true, isDeleted: { $ne: true } });
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/me - Current user's profile
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/me', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user?._id)
            .select('-password -__v')
            .populate('company')
            .lean();

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users - List users (filters + opt-in pagination)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role, status, search, company, page, limit } = req.query as Record<
            string,
            string | undefined
        >;

        const query: Record<string, unknown> = { isDeleted: { $ne: true } };
        if (role) query.role = role;
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;
        if (company) query.company = company;
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            query.$or = [{ name: rx }, { email: rx }];
        }

        const base = User.find(query)
            .select('-password')
            .populate('company', 'name')
            .sort({ createdAt: -1 });

        // Backward compatible: only paginate when page/limit is supplied.
        if (page !== undefined || limit !== undefined) {
            const p = Math.max(1, parseInt(page || '1', 10) || 1);
            const l = Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25));
            const total = await User.countDocuments(query);
            const users = await base.skip((p - 1) * l).limit(l).lean();
            return res.json({
                success: true,
                data: users,
                pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) },
            });
        }

        const users = await base.lean();
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users - Create user
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, company, phone, mustChangePassword } = req.body;

        if (!email || !password || !role) {
            throw new AppError('Email, password, and role are required', 400);
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        const newUser = new User({
            name,
            email,
            password,
            role,
            phone,
            isActive: true,
            mustChangePassword: Boolean(mustChangePassword),
        });
        // Company only applies to customers (schema requires null for admin/agent).
        if (role === 'customer' && company) {
            newUser.set('company', company);
        }
        await newUser.save();

        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { name, email, role },
        });

        newUser.password = undefined;
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/users/:id - Update user (+ safety guards)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, isActive, phone, company } = req.body;
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate || userToUpdate.isDeleted) {
            throw new AppError('User not found', 404);
        }

        const isSelf = String(userToUpdate._id) === String(req.user?._id);
        const newRole = role ?? userToUpdate.role;
        const newActive = isActive ?? userToUpdate.isActive;

        // ── Guards ───────────────────────────────────────────────
        if (isSelf && newActive === false && userToUpdate.isActive) {
            throw new AppError('You cannot deactivate your own account', 400);
        }
        if (isSelf && userToUpdate.role === 'admin' && newRole !== 'admin') {
            throw new AppError('You cannot remove your own admin role', 400);
        }
        if (userToUpdate.role === 'admin' && userToUpdate.isActive && newActive === false) {
            if ((await activeAdminCount()) <= 1) {
                throw new AppError('Cannot deactivate the last active admin', 400);
            }
        }
        if (userToUpdate.role === 'admin' && userToUpdate.isActive && newRole !== 'admin') {
            if ((await activeAdminCount()) <= 1) {
                throw new AppError('Cannot demote the last active admin', 400);
            }
        }

        // ── Apply updates ────────────────────────────────────────
        if (name !== undefined) userToUpdate.name = name;
        if (email !== undefined) userToUpdate.email = email;
        if (phone !== undefined) userToUpdate.phone = phone;
        if (role !== undefined) userToUpdate.role = role;
        if (isActive !== undefined) userToUpdate.isActive = isActive;

        // Company: only customers may have one; clear it for admin/agent.
        if (newRole === 'customer') {
            if (company !== undefined) userToUpdate.set('company', company);
        } else {
            userToUpdate.set('company', undefined);
        }

        // Admin-initiated password change forces a change on next login and
        // invalidates the user's other active sessions.
        if (password) {
            userToUpdate.password = password; // hashed + validated by the model on save
            userToUpdate.mustChangePassword = true;
            userToUpdate.tokenVersion = (userToUpdate.tokenVersion || 0) + 1;
        }

        await userToUpdate.save();

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: userToUpdate._id.toString(),
            req,
            details: { updates: Object.keys(req.body) }, // key names only — never values
        });

        userToUpdate.password = undefined;
        res.json({ success: true, data: userToUpdate });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users/:id/reset-password - Admin reset (temp shown once)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/reset-password', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) {
            throw new AppError('User not found', 404);
        }

        const tempPassword = generateTempPassword();
        user.password = tempPassword; // hashed + validated by the model on save
        user.mustChangePassword = true;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate existing sessions

        await user.save();

        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: user._id.toString(),
            req,
            details: { field: 'password', reset: true }, // never the password/hash
            severity: 'warning',
        });

        // Returned ONCE. Never logged or persisted in plaintext.
        res.json({ success: true, data: { tempPassword } });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/users/:id - Soft delete (+ guards)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) {
            throw new AppError('User not found', 404);
        }

        if (String(user._id) === String(req.user?._id)) {
            throw new AppError('You cannot delete your own account', 400);
        }
        if (user.role === 'admin' && user.isActive && (await activeAdminCount()) <= 1) {
            throw new AppError('Cannot delete the last active admin', 400);
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        user.isActive = false; // excluded from listings + blocked by protect immediately
        await user.save();

        await logAudit({
            action: 'DELETE',
            entity: 'User',
            entityId: user._id.toString(),
            req,
            details: { soft: true },
            severity: 'warning',
        });

        res.json({ success: true, data: { id: user._id, isDeleted: true } });
    } catch (error) {
        next(error);
    }
});

export default router;
