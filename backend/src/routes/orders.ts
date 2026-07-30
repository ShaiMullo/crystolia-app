// ===============================================
// 📦 Orders Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { changeOrderStatus } from '../services/orderStatusService.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import { computeOrderTotals, RawOrderItem } from '../services/orderService.js';
import { resolveOrderSkus } from '../services/catalogService.js';
import { enabledPaymentMethods, isPaymentPreference } from '../utils/paymentOptions.js';
import {
    isCustomerNotifiableStatus,
    notifyAdminOfNewOrder,
    notifyCustomerOfOrderStatus,
} from '../services/orderNotificationService.js';

const router = Router();

// Protect ALL routes
router.use(protect);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Customer-facing order handlers (shared)
// Exported so the versioned /api/v1/me router (routes/me.ts) reuses the EXACT
// same logic as the legacy /api/orders mounts below — one implementation, no
// drift. listOrders is role-aware (customer → own company; admin/agent → all);
// under /api/v1/me it is gated to customers, so it returns only the caller's
// own orders. The admin-only PATCH /:id stays defined inline below.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST place order (Customer Only) — legacy: POST /api/orders
// Optional client-generated idempotency key — a UUID fits, anything else
// id-shaped works too. Wrong shape is rejected rather than silently ignored
// so a typo'd integration can't believe it has dedupe protection.
const CLIENT_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

export const placeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { items: requestedItems, notes, paymentPreference, clientRequestId } = req.body;

        if (clientRequestId !== undefined
            && (typeof clientRequestId !== 'string' || !CLIENT_REQUEST_ID.test(clientRequestId))) {
            return next(new AppError('clientRequestId must be 8-64 characters of [A-Za-z0-9._-]', 400));
        }

        if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
            return next(new AppError('Order must contain at least one item', 400));
        }
        if (requestedItems.length > 50) {
            return next(new AppError('Order contains too many product lines', 400));
        }

        // Customer-supplied names and prices are never trusted. The portal only
        // sends SKU + quantity; authoritative labels/prices come from the
        // Product collection, with Settings.boxPrices as the legacy fallback
        // for SKUs that have no Product counterpart (see catalogService.ts).
        // A missing settings document no longer blocks Product-backed orders.
        const businessSettings = await Settings.findOne({ key: 'business' }).lean();

        // The customer must state how they intend to pay, and only from the
        // methods the admin currently has enabled. With nothing enabled,
        // ordering is closed until Settings are configured — the portal shows
        // the matching translated notice for PAYMENT_METHODS_UNAVAILABLE.
        const enabledMethods = enabledPaymentMethods(businessSettings?.paymentOptions);
        if (enabledMethods.length === 0) {
            return next(new AppError('PAYMENT_METHODS_UNAVAILABLE', 400));
        }
        if (!isPaymentPreference(paymentPreference) || !enabledMethods.includes(paymentPreference)) {
            return next(new AppError('A valid payment method selection is required', 400));
        }

        const quantityBySku = new Map<string, number>();
        for (const item of requestedItems) {
            const sku = typeof item?.sku === 'string' ? item.sku.trim() : '';
            const quantity = Number(item?.quantity);
            if (!sku || sku.length > 80 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100_000) {
                return next(new AppError('Invalid order item', 400));
            }
            const combined = (quantityBySku.get(sku) ?? 0) + quantity;
            if (!Number.isSafeInteger(combined) || combined > 100_000) {
                return next(new AppError('Invalid order quantity', 400));
            }
            quantityBySku.set(sku, combined);
        }

        const requestedSkus = [...quantityBySku.keys()];
        const resolution = await resolveOrderSkus(requestedSkus, businessSettings?.boxPrices ?? []);
        if (!resolution.lines) {
            return next(new AppError('One or more products are no longer available', 400));
        }

        const pricedItems: RawOrderItem[] = resolution.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: quantityBySku.get(line.sku)!,
            price: line.price,
            taxRate: line.taxRate,
        }));

        const totals = computeOrderTotals(pricedItems);
        const totalAmount = totals.totalAmount;

        // Enforce minimum order amount using the SERVER-CALCULATED total.
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

        // Users who registered through the approval flow must complete the
        // delivery/invoice details before their first order. Legacy accounts
        // (no registrationMethod) are exempt so existing customers keep
        // working unchanged.
        if (user.registrationMethod) {
            const company = await Company.findById(user.company)
                .select('address city billingAddress billingEmail')
                .lean();
            const missing = (['address', 'city', 'billingAddress', 'billingEmail'] as const)
                .filter((field) => !String(company?.[field] ?? '').trim());
            if (missing.length > 0) {
                return next(new AppError('ORDER_PROFILE_INCOMPLETE', 403));
            }
        }

        let newOrder;
        try {
            newOrder = await Order.create({
                company: user.company,
                createdBy: user._id,
                items: totals.items.map((item, index) => ({
                    ...item,
                    sku: requestedSkus[index],
                })),
                totalAmount,
                subtotal: totals.subtotal,
                taxTotal: totals.taxTotal,
                status: 'pending',
                paymentPreference,
                clientRequestId,
                notes,
                timeline: [{ type: 'order_created', at: new Date(), actorId: user._id?.toString() }],
            });
        } catch (createErr) {
            // Duplicate (createdBy, clientRequestId) means this exact submission
            // already succeeded — a double-click or network retry. Return the
            // existing order instead of creating a second one.
            if ((createErr as { code?: number }).code === 11000 && clientRequestId) {
                const existing = await Order.findOne({ createdBy: user._id, clientRequestId });
                if (existing) {
                    return res.status(200).json({ success: true, data: existing, deduplicated: true });
                }
            }
            throw createErr;
        }

        await logAudit({
            action: 'CREATE',
            entity: 'Order',
            entityId: newOrder._id.toString(),
            req,
            details: { totalAmount, itemCount: requestedSkus.length },
        });

        const [adminNotification, customerNotification] = await Promise.all([
            notifyAdminOfNewOrder(newOrder).catch((error: unknown) => ({
                success: false,
                error: error instanceof Error ? error.message : 'Notification failed',
            })),
            notifyCustomerOfOrderStatus(newOrder, 'pending').catch((error: unknown) => ({
                email: { success: false, error: error instanceof Error ? error.message : 'Notification failed' },
                sms: { success: false, error: error instanceof Error ? error.message : 'Notification failed' },
            })),
        ]);
        newOrder.timeline.push({
            type: 'admin_order_notification',
            at: new Date(),
            actorId: user._id?.toString(),
            meta: { channel: 'sms', result: adminNotification.success ? 'sent' : 'failed' },
        });
        newOrder.timeline.push({
            type: 'customer_order_notification',
            at: new Date(),
            actorId: user._id?.toString(),
            meta: {
                status: 'pending',
                email: customerNotification.email.success ? 'sent' : 'failed',
                sms: customerNotification.sms.success ? 'sent' : 'failed',
            },
        });
        await newOrder.save();

        res.status(201).json({
            success: true,
            data: newOrder
        });
    } catch (error) {
        next(error);
    }
};

// GET orders (role-aware) — legacy: GET /api/orders
export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
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
};

// ━━━ Legacy /api/orders mounts (unchanged behavior) ━━━
router.post('/', authorize('customer'), orderLimiter, placeOrder);
router.get('/', listOrders);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/orders/:id (Admin/Agent Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', authorize('admin', 'agent'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!status) {
            return next(new AppError('Please provide a status', 400));
        }

        const allowedStatuses = ['pending', 'approved', 'rejected', 'shipped', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return next(new AppError('Invalid status', 400));
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        // The entire workflow — transition rules, concurrency lock,
        // fail-closed reservation, safe shipment, single invoice — lives in
        // changeOrderStatus, shared with the CRM router. A refusal leaves
        // the order exactly as it was: no invoice, no notification.
        const previousStatus = order.status;
        const result = await changeOrderStatus({
            orderId: order._id,
            expectedCurrentStatus: previousStatus,
            targetStatus: status,
            actorId: req.user?._id?.toString(),
            rejectionReason,
        });
        if (!result.ok) {
            return next(new AppError(result.error, result.httpStatus));
        }
        const updated = result.order;

        await logAudit({
            action: 'UPDATE',
            entity: 'Order',
            entityId: updated._id.toString(),
            req,
            details: { status },
        });

        if (previousStatus !== status && isCustomerNotifiableStatus(status)) {
            const notifications = await notifyCustomerOfOrderStatus(updated, status)
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
                actorId: req.user?._id?.toString(),
                meta: {
                    status,
                    email: notifications.email.success ? 'sent' : 'failed',
                    sms: notifications.sms.success ? 'sent' : 'failed',
                },
            });
            await updated.save();
        }

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
});

export default router;
