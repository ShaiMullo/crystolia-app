// ===============================================
// 📦 CRM Orders Routes (admin order workflow)
// ===============================================
// Admin-side order creation/editing. The customer-portal POST stays in
// routes/orders.ts untouched. Inventory side-effects on status changes
// are already handled by routes/orders.ts PATCH — admin status changes
// here delegate to that same logic via shared inventory helpers.

import { Router, Request, Response, NextFunction } from 'express';
import Order, { type IOrder } from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { computeOrderTotals, validateOrderItems, RawOrderItem } from '../services/orderService.js';
import { changeOrderStatus, unlockedOrderFilter } from '../services/orderStatusService.js';
import Inventory from '../models/Inventory.js';
import {
    isCustomerNotifiableStatus,
    notifyCustomerOfOrderStatus,
} from '../services/orderNotificationService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const STATUSES = ['pending', 'approved', 'rejected', 'shipped', 'completed', 'cancelled'] as const;
type OrderStatus = (typeof STATUSES)[number];

// Resolve the Company id from either a Company id or a Customer id.
async function resolveCompanyId(body: Record<string, unknown>): Promise<string | null> {
    if (typeof body.companyId === 'string' && validate.objectId(body.companyId)) {
        const company = await Company.findById(body.companyId).select('_id');
        if (company) return company._id.toString();
    }
    if (typeof body.customerId === 'string' && validate.objectId(body.customerId)) {
        const customer = await Customer.findById(body.customerId).select('company');
        if (customer?.company) return customer.company.toString();
    }
    return null;
}

// ━━ GET /api/crm/orders - list
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

        const filter: Record<string, unknown> = {};
        if (typeof req.query.status === 'string' && STATUSES.includes(req.query.status as OrderStatus)) {
            filter.status = req.query.status;
        }
        if (typeof req.query.companyId === 'string' && validate.objectId(req.query.companyId)) {
            filter.company = req.query.companyId;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('company', 'name')
                .populate('createdBy', 'name email')
                .lean(),
            Order.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/orders/:id - detail incl. linked invoices
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Order ID', 400);
        const order = await Order.findById(req.params.id)
            .populate('company', 'name vatNumber email phone')
            .populate('createdBy', 'name email')
            .lean();
        if (!order) throw new AppError('Order not found', 404);

        const [invoices, customer] = await Promise.all([
            Invoice.find({ order: order._id }).sort({ createdAt: -1 }).lean(),
            Customer.findOne({ company: order.company, isDeleted: false }).select('_id contactName').lean(),
        ]);

        res.json({ success: true, data: { ...order, invoices, customer } });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/orders/preview - compute totals + inventory preview (no write)
router.post('/preview', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const items = (req.body?.items || []) as RawOrderItem[];
        const totals = computeOrderTotals(items);

        // Inventory preview per product line.
        const productIds = items.map((i) => i.productId).filter(Boolean) as string[];
        const inventoryRows = productIds.length
            ? await Inventory.find({ product: { $in: productIds }, location: 'main' }).lean()
            : [];
        const invMap = new Map(inventoryRows.map((r) => [r.product.toString(), r]));

        const preview = totals.items.map((line) => {
            const row = line.productId ? invMap.get(line.productId) : undefined;
            const available = row ? Math.max(0, row.quantity - row.reservedQuantity) : null;
            return {
                productId: line.productId,
                productName: line.productName,
                quantity: line.quantity,
                available,
                sufficient: available === null ? true : available >= line.quantity,
            };
        });

        res.json({ success: true, data: { totals, preview } });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/orders - create
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        const itemsError = validateOrderItems(body.items);
        if (itemsError) throw new AppError(itemsError, 400);

        const companyId = await resolveCompanyId(body);
        if (!companyId) throw new AppError('A valid customer or company is required', 400);

        // Creation supports pending (default) or approved. Approved does NOT
        // bypass the shared workflow: the order is created pending and then
        // run through the same fail-closed approval as every other order. A
        // reservation failure leaves it pending and reports approvalError.
        const requestedStatus = typeof body.status === 'string' ? body.status : 'pending';
        if (requestedStatus !== 'pending' && requestedStatus !== 'approved') {
            throw new AppError("New orders may only be created as 'pending' or 'approved'", 400);
        }

        const totals = computeOrderTotals(body.items as RawOrderItem[]);
        const now = new Date();
        const actorId = req.user?._id?.toString();

        let order: IOrder = await Order.create({
            company: companyId,
            createdBy: req.user?._id,
            items: totals.items.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                quantity: i.quantity,
                price: i.price,
                taxRate: i.taxRate || undefined,
            })),
            totalAmount: totals.totalAmount,
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            status: 'pending',
            notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
            timeline: [{ type: 'order_created', at: now, actorId }],
        });

        await logAudit({
            action: 'CREATE',
            entity: 'Order',
            entityId: order._id.toString(),
            req,
            details: { totalAmount: totals.totalAmount, itemCount: totals.items.length, source: 'admin' },
        });

        let approvalError: string | undefined;
        if (requestedStatus === 'approved') {
            const result = await changeOrderStatus({
                orderId: order._id,
                expectedCurrentStatus: 'pending',
                targetStatus: 'approved',
                actorId,
            });
            if (result.ok) {
                order = result.order;
            } else {
                approvalError = result.error;
            }
        }

        res.status(201).json({
            success: true,
            data: order.toObject(),
            ...(approvalError ? { approvalError } : {}),
        });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/orders/:id/notifications/retry - resend a FAILED
// customer notification for the order's current status.
// Safe by construction: only runs when the latest notification attempt for
// the current status recorded a failure; double-submit is blocked by an
// atomic 30-second claim on notificationRetryAt; every attempt is recorded
// on the timeline and audit-logged. Nothing else about the order changes.
const NOTIFICATION_RETRY_WINDOW_MS = 30 * 1000;

router.post('/:id/notifications/retry', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Order ID', 400);
        const order = await Order.findById(req.params.id);
        if (!order) throw new AppError('Order not found', 404);

        if (!isCustomerNotifiableStatus(order.status)) {
            throw new AppError('The current order status has no customer notification to retry', 409);
        }

        // Latest notification attempt for the CURRENT status must have failed.
        const lastForStatus = [...order.timeline].reverse().find(
            (e) => e.type === 'customer_order_notification'
                && (e.meta as { status?: string } | undefined)?.status === order.status,
        );
        const lastMeta = lastForStatus?.meta as { email?: string; sms?: string } | undefined;
        const hasFailure = lastMeta && (lastMeta.email === 'failed' || lastMeta.sms === 'failed');
        if (!hasFailure) {
            throw new AppError('The last notification for this status did not fail — nothing to retry', 409);
        }

        // Atomic double-submit guard.
        const now = new Date();
        const claimed = await Order.findOneAndUpdate(
            {
                _id: order._id,
                $or: [
                    { notificationRetryAt: { $exists: false } },
                    { notificationRetryAt: null },
                    { notificationRetryAt: { $lt: new Date(now.getTime() - NOTIFICATION_RETRY_WINDOW_MS) } },
                ],
            },
            { $set: { notificationRetryAt: now } },
            { new: true },
        );
        if (!claimed) {
            throw new AppError('A notification retry is already in progress — wait a moment and reload', 429);
        }

        const actorId = req.user?._id?.toString();
        const notifications = await notifyCustomerOfOrderStatus(claimed, claimed.status)
            .catch((error: unknown) => ({
                email: { success: false, error: error instanceof Error ? error.message : 'Notification failed' },
                sms: { success: false, error: error instanceof Error ? error.message : 'Notification failed' },
            }));

        claimed.timeline.push({
            type: 'customer_order_notification',
            at: new Date(),
            actorId,
            meta: {
                status: claimed.status,
                retry: true,
                email: notifications.email.success ? 'sent' : 'failed',
                sms: notifications.sms.success ? 'sent' : 'failed',
            },
        });
        await claimed.save();

        await logAudit({
            action: 'NOTIFICATION_RETRY',
            entity: 'Order',
            entityId: claimed._id.toString(),
            req,
            details: {
                status: claimed.status,
                email: notifications.email.success ? 'sent' : 'failed',
                sms: notifications.sms.success ? 'sent' : 'failed',
            },
        });

        res.json({
            success: true,
            data: {
                email: notifications.email.success ? 'sent' : 'failed',
                sms: notifications.sms.success ? 'sent' : 'failed',
            },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/orders/:id - edit items / notes / status
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Order ID', 400);
        const order = await Order.findById(req.params.id);
        if (!order) throw new AppError('Order not found', 404);

        const body = req.body || {};
        const now = new Date();
        const actorId = req.user?._id?.toString();
        // Item edits are a single CONDITIONAL update: they atomically
        // require status=pending AND no live status-transition lock, so an
        // edit can never race an in-flight approval and change the lines
        // after the reservation was computed. Notes alone may change on any
        // status.
        let updated: IOrder = order;
        const wantsItemEdit = Array.isArray(body.items);
        const wantsNotesEdit = typeof body.notes === 'string';
        if (wantsItemEdit || wantsNotesEdit) {
            const set: Record<string, unknown> = {};
            let timelineEvent: Record<string, unknown> | undefined;
            if (wantsItemEdit) {
                const itemsError = validateOrderItems(body.items);
                if (itemsError) throw new AppError(itemsError, 400);
                const totals = computeOrderTotals(body.items as RawOrderItem[]);
                set.items = totals.items.map((i) => ({
                    productId: i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    price: i.price,
                    taxRate: i.taxRate || undefined,
                }));
                set.totalAmount = totals.totalAmount;
                set.subtotal = totals.subtotal;
                set.taxTotal = totals.taxTotal;
                timelineEvent = { type: 'order_items_updated', at: now, actorId };
            }
            if (wantsNotesEdit) {
                set.notes = (body.notes as string).trim();
            }
            const filter = wantsItemEdit
                ? { _id: order._id, status: 'pending' as const, ...unlockedOrderFilter(now) }
                : { _id: order._id };
            const edited = await Order.findOneAndUpdate(
                filter,
                { $set: set, ...(timelineEvent ? { $push: { timeline: timelineEvent } } : {}) },
                { new: true, runValidators: true },
            );
            if (!edited) {
                throw new AppError(
                    'Items can only be edited while the order is pending and not being processed by another request',
                    409,
                );
            }
            updated = edited;
        }

        // Status changes run through the SAME shared workflow as
        // routes/orders.ts PATCH (transition rules, concurrency lock,
        // fail-closed reservation, safe shipment, single invoice). A refusal
        // aborts the request but keeps the saved item/notes edits.
        let statusChanged = false;
        if (typeof body.status === 'string') {
            if (!STATUSES.includes(body.status as OrderStatus)) throw new AppError('Invalid status', 400);
            if (body.status !== updated.status) {
                const result = await changeOrderStatus({
                    orderId: updated._id,
                    expectedCurrentStatus: updated.status,
                    targetStatus: body.status as OrderStatus,
                    actorId,
                    rejectionReason: typeof body.rejectionReason === 'string' ? body.rejectionReason : undefined,
                });
                if (!result.ok) throw new AppError(result.error, result.httpStatus);
                updated = result.order;
                statusChanged = true;
            }
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'Order',
            entityId: updated._id.toString(),
            req,
            details: { status: updated.status, totalAmount: updated.totalAmount },
        });

        if (statusChanged && isCustomerNotifiableStatus(updated.status)) {
            const notifications = await notifyCustomerOfOrderStatus(updated, updated.status)
                .catch((error: unknown) => ({
                    email: {
                        success: false,
                        error: error instanceof Error ? error.message : 'Notification failed',
                    },
                    sms: {
                        success: false,
                        error: error instanceof Error ? error.message : 'Notification failed',
                    },
                }));
            updated.timeline.push({
                type: 'customer_order_notification',
                at: new Date(),
                actorId,
                meta: {
                    status: updated.status,
                    email: notifications.email.success ? 'sent' : 'failed',
                    sms: notifications.sms.success ? 'sent' : 'failed',
                },
            });
            await updated.save();
        }

        res.json({ success: true, data: updated.toObject() });
    } catch (err) {
        next(err);
    }
});

export default router;
