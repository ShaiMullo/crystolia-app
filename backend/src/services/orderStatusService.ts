// ===============================================
// 📦 Order status transitions — the ONE shared workflow
// ===============================================
// Both admin surfaces (routes/orders.ts PATCH and routes/crmOrders.ts
// PATCH) and CRM create-as-approved run status changes through
// changeOrderStatus so the rules can never drift:
//
//   * explicit transition map (illegal jumps → 409)
//   * concurrent requests serialized by an atomic lock claim — exactly one
//     transition, one reservation set, one invoice
//   * approval FAILS CLOSED: every tracked line must reserve or the order
//     stays in its previous status (no invoice, no notification)
//   * shipping is all-or-nothing: a failure leaves the order approved with
//     its reservation intact
//   * leaving `approved` (not to shipped) releases the reservation

import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Settings from '../models/Settings.js';
import {
    reserveAllForOrder,
    releaseForOrder,
    shipAllForOrder,
} from './inventoryService.js';
import { paymentConfigError } from '../utils/paymentOptions.js';
import { notifyAdmins } from './notificationService.js';

export type OrderStatus = IOrder['status'];

// Explicit state machine. Any pair not listed here is rejected. Reopen
// paths (→pending) are kept so an admin can undo a mistaken decision
// before shipment.
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['shipped', 'cancelled', 'rejected', 'pending'],
    shipped: ['completed', 'cancelled'],
    completed: [],
    rejected: ['pending'],
    cancelled: ['pending'],
};

/** Human-readable refusal, or null when the transition is allowed. */
export function transitionError(from: OrderStatus, to: OrderStatus): string | null {
    if (from === to) return null;
    if (ALLOWED_TRANSITIONS[from]?.includes(to)) return null;
    return `Cannot change order status from '${from}' to '${to}'`;
}

/**
 * Reservation state for an order. Legacy orders (approved before the
 * inventoryReserved flag existed) have `undefined` — for them the previous
 * status is the best available signal. New orders track the flag
 * explicitly.
 */
function hasActiveReservation(order: IOrder, previousStatus: OrderStatus): boolean {
    if (typeof order.inventoryReserved === 'boolean') return order.inventoryReserved;
    return previousStatus === 'approved';
}

// A crashed process must not leave an order permanently locked.
const LOCK_TTL_MS = 2 * 60 * 1000;

export type StatusChangeResult =
    | { ok: true; order: IOrder }
    | { ok: false; httpStatus: number; error: string };

export interface StatusChangeInput {
    orderId: mongoose.Types.ObjectId | string;
    /** The status the caller read — the CAS baseline. */
    expectedCurrentStatus: OrderStatus;
    targetStatus: OrderStatus;
    actorId?: string;
    rejectionReason?: string;
}

/**
 * Perform one status transition end-to-end. Returns the updated order or a
 * typed refusal ({httpStatus, error}) — it never leaves partial state:
 * a failed reservation/shipment keeps the previous status, and the lock is
 * always released.
 */
export async function changeOrderStatus(input: StatusChangeInput): Promise<StatusChangeResult> {
    const { expectedCurrentStatus: from, targetStatus: to, actorId } = input;

    if (from === to) {
        const unchanged = await Order.findById(input.orderId);
        if (!unchanged) return { ok: false, httpStatus: 404, error: 'Order not found' };
        return { ok: true, order: unchanged };
    }

    const invalid = transitionError(from, to);
    if (invalid) return { ok: false, httpStatus: 409, error: invalid };

    if (to === 'rejected' && !String(input.rejectionReason || '').trim()) {
        return { ok: false, httpStatus: 400, error: 'Rejection reason is required' };
    }

    // An approval sends the customer their selected payment instructions —
    // refuse to approve while that method's configuration is unusable.
    if (to === 'approved') {
        const orderForGuard = await Order.findById(input.orderId).select('paymentPreference');
        if (!orderForGuard) return { ok: false, httpStatus: 404, error: 'Order not found' };
        if (orderForGuard.paymentPreference) {
            const settings = await Settings.findOne({ key: 'business' }).select('paymentOptions').lean();
            const configError = paymentConfigError(orderForGuard.paymentPreference, settings?.paymentOptions);
            if (configError) return { ok: false, httpStatus: 409, error: `Cannot approve: ${configError}` };
        }
    }

    // ━━━ Atomic claim: exactly ONE concurrent request may process this
    // transition. The filter re-checks the status, so a request racing a
    // completed transition loses here, not later. ━━━
    const now = new Date();
    const staleBefore = new Date(now.getTime() - LOCK_TTL_MS);
    const order = await Order.findOneAndUpdate(
        {
            _id: input.orderId,
            status: from,
            $or: [
                { statusLockAt: { $exists: false } },
                { statusLockAt: null },
                { statusLockAt: { $lt: staleBefore } },
            ],
        },
        { $set: { statusLockAt: now } },
        { new: true },
    );
    if (!order) {
        return {
            ok: false,
            httpStatus: 409,
            error: 'Order status changed or is being processed by another request — reload and retry',
        };
    }

    const unlock = () =>
        Order.updateOne({ _id: order._id }, { $unset: { statusLockAt: 1 } }).catch(() => undefined);

    try {
        const items = (order.items || []).map((item) => ({
            productId: item.productId?.toString(),
            quantity: item.quantity,
        }));
        const reserved = hasActiveReservation(order, from);
        let nextReservedFlag = reserved;

        // ━━━ Inventory effects BEFORE the status commit — fail closed. ━━━
        if (to === 'approved') {
            if (!reserved) {
                const result = await reserveAllForOrder(order._id, items, actorId);
                if (!result.ok) {
                    await unlock();
                    return {
                        ok: false,
                        httpStatus: 409,
                        error: `Cannot approve: stock reservation failed — ${result.error}`,
                    };
                }
                nextReservedFlag = true;
            }
        } else if (to === 'shipped') {
            const result = await shipAllForOrder(order._id, items, actorId, reserved);
            if (!result.ok) {
                await unlock();
                return {
                    ok: false,
                    httpStatus: 409,
                    error: `Cannot ship: stock deduction failed — ${result.error}`,
                };
            }
            nextReservedFlag = false;
        } else if (from === 'approved' && (to === 'cancelled' || to === 'rejected' || to === 'pending')) {
            if (reserved) {
                // Releasing must not block a cancellation/reopen; failures are
                // surfaced on the timeline + an admin notification below.
                const failures = await releaseForOrder(order._id, items, actorId);
                nextReservedFlag = false;
                if (failures.length > 0) {
                    order.timeline.push({
                        type: 'inventory_movement_failed',
                        at: new Date(),
                        actorId,
                        meta: { status: to, failures },
                    });
                    await notifyAdmins({
                        type: 'inventory_reservation_failed',
                        entityId: `${order._id.toString()}:release:${to}`,
                        title: `Stock release failed for order ${order._id.toString().slice(-8)}`,
                        body: failures.map((f) => `${f.quantity}× product ${f.productId}: ${f.error}`).join('; ').slice(0, 500),
                        link: `/admin/orders/${order._id.toString()}`,
                        icon: '⚠️',
                    }).catch(() => undefined);
                }
            }
        }

        // ━━━ Commit the transition + release the lock in one write. ━━━
        order.status = to;
        order.inventoryReserved = nextReservedFlag;
        if (to === 'rejected') {
            order.rejectionReason = String(input.rejectionReason).trim();
        } else if (from === 'rejected') {
            order.rejectionReason = undefined;
        }
        order.timeline.push({
            type: 'status_changed',
            at: new Date(),
            actorId,
            meta: { from, to },
        });
        order.statusLockAt = undefined;
        await order.save();

        // ━━━ Auto-invoice on approval — unique per order at the DB level. ━━━
        if (to === 'approved') {
            await ensureOrderInvoice(order);
        }

        return { ok: true, order };
    } catch (err) {
        await unlock();
        throw err;
    }
}

/**
 * Create the order's draft invoice exactly once. The partial unique index
 * on Invoice.order makes concurrent creators collide; the loser loads the
 * winner's document. Never throws — a failed invoice must not undo an
 * otherwise-committed approval (it is retried on the next approval or
 * created manually).
 */
async function ensureOrderInvoice(order: IOrder): Promise<void> {
    try {
        const existing = await Invoice.findOne({ order: order._id }).select('_id');
        if (existing) return;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${attempt ? `-${attempt}` : ''}`;
            try {
                await Invoice.create({
                    company: order.company,
                    order: order._id,
                    invoiceNumber,
                    totalAmount: order.totalAmount,
                    status: 'draft',
                });
                return;
            } catch (err) {
                const dup = (err as { code?: number; keyPattern?: Record<string, unknown> });
                if (dup.code !== 11000) throw err;
                // Duplicate on order → a concurrent request already created it.
                if (dup.keyPattern && 'order' in dup.keyPattern) return;
                // Duplicate invoiceNumber → retry once with a distinct suffix.
            }
        }
    } catch (err) {
        console.error('❌ Auto-invoice creation failed:', (err as Error).message);
    }
}
