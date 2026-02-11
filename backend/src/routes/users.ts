// ===============================================
// 👥 Users Router
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users/me - Get current user profile
// 🔒 Protected: All Authenticated Users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/me', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Populating company details
        const user = await User.findById(req.user?._id)
            .select('-password -__v')
            .populate('company')
            .lean();

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            success: true,
            data: {
                user,
                // If company is populated, it will be in user.company
                // But for convenience, we can also separate it if the frontend prefers
                // For now, let's just return the user object which contains the company
            }
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/users - Get all users
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await User.find({ isDeleted: { $ne: true } })
            .select('-password') // Exclude password
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/users - Create new user
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role } = req.body;

        if (!email || !password || !role) {
            throw new AppError('Email, password, and role are required', 400);
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        const newUser = await User.create({
            name,
            email,
            password,
            role,
            isActive: true
        });

        // Audit
        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { name, email, role }
        });

        newUser.password = undefined; // Don't return password

        res.status(201).json({
            success: true,
            data: newUser
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/users/:id - Update user (Active/Role/Password)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, isActive } = req.body;
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate) {
            throw new AppError('User not found', 404);
        }

        // Apply updates
        if (name) userToUpdate.name = name;
        if (email) userToUpdate.email = email;
        if (role) userToUpdate.role = role;
        if (isActive !== undefined) userToUpdate.isActive = isActive;
        if (password) userToUpdate.password = password; // Will be hashed by pre-save hook

        await userToUpdate.save();

        // Audit
        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: userToUpdate._id.toString(),
            req,
            details: { updates: Object.keys(req.body) }
        });

        userToUpdate.password = undefined;

        res.json({
            success: true,
            data: userToUpdate
        });
    } catch (error) {
        next(error);
    }
});

export default router;
