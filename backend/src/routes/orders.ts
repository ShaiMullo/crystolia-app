// ===============================================
// 📦 Orders Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import User from '../models/User.js'; // Needed if we want to double-check user properties
import { AppError } from '../utils/validation.js';

const router = Router();

// Protect ALL routes
router.use(protect);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/orders (Customer Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return next(new AppError('Order must contain at least one item', 400));
        }

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            if (!item.productName || !item.quantity || item.price === undefined) {
                return next(new AppError('Invalid item structure', 400));
            }
            totalAmount += item.quantity * item.price;
        }

        // Ensure user has a company (should be guaranteed by model/registration, but good to check)
        // We need to cast req.user because Express.User types might not have 'company' explicit yet
        // but our auth middleware attaches the full Mongoose document.
        const user = req.user as any;

        if (!user.company) {
            return next(new AppError('User is not linked to a company', 400));
        }

        const newOrder = await Order.create({
            company: user.company,
            createdBy: user._id,
            items,
            totalAmount,
            status: 'pending',
            notes
        });

        res.status(201).json({
            success: true,
            data: newOrder
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/orders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        let query = {};

        // RBAC Logic
        if (user.role === 'customer') {
            // Customer -> Only their company
            if (!user.company) return next(new AppError('No company linked', 403));
            query = { company: user.company };
        } else {
            // Admin/Agent -> All orders
            // Optional: Filter by company if provided in query
            if (req.query.companyId) {
                query = { company: req.query.companyId };
            }
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('company', 'name')
            .populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/orders/:id (Admin/Agent Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', authorize('admin', 'agent'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;

        if (!status) {
            return next(new AppError('Please provide a status', 400));
        }

        const allowedStatuses = ['pending', 'approved', 'shipped', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return next(new AppError('Invalid status', 400));
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
});

export default router;
