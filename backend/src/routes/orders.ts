// ===============================================
// 📦 Orders Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js'; // Needed if we want to double-check user properties
import Settings from '../models/Settings.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { reserveForOrder, releaseForOrder, shipForOrder } from '../services/inventoryService.js';

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

        // Enforce minimum order amount
        const businessSettings = await Settings.findOne({ key: 'business' }).lean();
        const minAmount = businessSettings?.minimumOrderAmount ?? 0;
        if (minAmount > 0 && totalAmount < minAmount) {
            return next(new AppError(`Minimum order amount is ${minAmount}`, 400));
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

        await logAudit({
            action: 'CREATE',
            entity: 'Order',
            entityId: newOrder._id.toString(),
            req,
            details: { totalAmount, itemCount: items.length },
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

        // Fetch first — need company + totalAmount for auto-invoice
        const order = await Order.findById(req.params.id);

        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        const previousStatus = order.status;
        order.status = status;
        await order.save();

        // ━━━ Inventory side-effects (best-effort, never block response) ━━━
        const orderItems = (order.items || []).map((it) => ({
            productId: it.productId?.toString(),
            quantity: it.quantity,
        }));
        const actorId = req.user?._id?.toString();

        if (status === 'approved' && previousStatus !== 'approved') {
            await reserveForOrder(order._id, orderItems, actorId);
        } else if (status === 'cancelled' && previousStatus === 'approved') {
            await releaseForOrder(order._id, orderItems, actorId);
        } else if (status === 'shipped' && previousStatus !== 'shipped' && previousStatus !== 'completed') {
            await shipForOrder(order._id, orderItems, actorId);
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'Order',
            entityId: order._id.toString(),
            req,
            details: { status },
        });

        // ━━━ Auto-create draft invoice on approval (idempotent) ━━━
        if (status === 'approved') {
            try {
                const existing = await Invoice.findOne({ order: order._id });
                if (!existing) {
                    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
                    const newInvoice = await Invoice.create({
                        company: order.company,
                        order: order._id,
                        invoiceNumber,
                        totalAmount: order.totalAmount,
                        status: 'draft',
                    });

                    await logAudit({
                        action: 'CREATE',
                        entity: 'Invoice',
                        entityId: newInvoice._id.toString(),
                        req,
                        details: { invoiceNumber, totalAmount: order.totalAmount, status: 'draft', source: 'auto' },
                    });

                    console.log(`📋 Auto-created draft invoice ${invoiceNumber} for order ${order._id}`);
                }
            } catch (invoiceErr: any) {
                // Duplicate invoice number (11000) means a concurrent request already created it — safe to ignore.
                // Any other error is logged but must not fail the order update response.
                if (invoiceErr.code !== 11000) {
                    console.error('❌ Auto-invoice creation failed:', invoiceErr.message);
                }
            }
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
