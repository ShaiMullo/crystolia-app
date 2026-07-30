// ===============================================
// 📦 Order status transitions — the ONE shared workflow
// ===============================================
// Both admin surfaces (routes/orders.ts PATCH and routes/crmOrders.ts
// PATCH) and CRM create-as-approved run status changes through
// changeOrderStatus so the rules can never drift:
//
//   * explicit transition map (illegal jumps → 409)
//   * for orders with stock-tracked lines, the ENTIRE transition — lock
//     claim, inventory summary updates, movement-log writes, status/flag
//     commit and the approval invoice — runs in ONE MongoDB transaction.
//     If transactions are unavailable (standalone mongod), the request is
//     refused with 503: we never claim all-or-nothing via best-effort
//     compensation.
//   * approval FAILS CLOSED: reservation and invoice must both succeed or
//     the order stays in its previous status (no notification either —
//     routes notify only after an ok result).
//   * a failed release keeps the order approved with inventoryReserved
//     intact (the transaction aborts).
//   * untracked-only orders take a safe non-inventory path (transaction
//     when available; otherwise invoice-first with explicit cleanup).

import mongoose, { ClientSession } from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import { applyMovement, applyShipLine } from './inventoryService.js';
import {
    runRequiredTransaction,
    withTransaction,
    TransactionsUnavailableError,
} from '../db/withTransaction.js';
import { invoiceIndexReadiness } from '../db/indexReadiness.js';
import { paymentConfigError } from '../utils/paymentOptions.js';
import { unlockedOrderFilter as lockFreeFilter, notificationLeaseFreeFilter } from './orderLocks.js';
import { reconcileNotificationLease } from './orderNotificationRetryService.js';

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

// Lock fragments live in orderLocks.ts (shared with the notification-retry
// workflow for symmetric mutual exclusion). Re-exported for existing
// consumers (crmOrders item edits).
export { unlockedOrderFilter } from './orderLocks.js';

class TransitionConflictError extends Error {
    constructor() {
        super('Order status changed or is being processed by another request — reload and retry');
        this.name = 'TransitionConflictError';
    }
}

class StockOperationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StockOperationError';
    }
}

class InvoiceCreationError extends Error {
    constructor(message: string) {
        super(`Invoice creation failed — approval aborted: ${message}`);
        this.name = 'InvoiceCreationError';
    }
}

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

// Timestamp + random suffix: collision-resistant enough to never abort an
// approval transaction over an invoiceNumber duplicate.
function generateInvoiceNumber(): string {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${rand}`;
}

/** How many of the order's product lines are stock-tracked. */
async function countTrackedLines(order: IOrder): Promise<number> {
    const productIds = (order.items || [])
        .map((item) => item.productId)
        .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    if (productIds.length === 0) return 0;
    return Product.countDocuments({
        _id: { $in: productIds },
        stockTrackingEnabled: true,
        isDeleted: { $ne: true },
    });
}

/**
 * The transition body. With a session every write below is atomic; without
 * one (untracked-only orders on a standalone deployment) the ordering is
 * chosen so a mid-sequence crash is safe: invoice before status commit,
 * explicit invoice cleanup if the commit fails, lock released on error.
 */
async function performTransition(
    input: StatusChangeInput,
    session: ClientSession | undefined,
): Promise<IOrder> {
    const { expectedCurrentStatus: from, targetStatus: to, actorId } = input;
    const now = new Date();

    // Atomic claim: exactly ONE concurrent request may process this
    // transition. The filter re-checks the status, so a request racing a
    // completed transition loses here, not later.
    const order = await Order.findOneAndUpdate(
        {
            _id: input.orderId,
            status: from,
            // Symmetric mutual exclusion with the notification-retry
            // workflow: a transition may not start while a retry holds its
            // lease (and the retry claim requires no live status lock).
            // $and keeps the two $or fragments from clobbering each other.
            $and: [lockFreeFilter(now), notificationLeaseFreeFilter()],
        },
        { $set: { statusLockAt: now } },
        { new: true, session: session ?? null },
    );
    if (!order) throw new TransitionConflictError();

    try {
        const lines = (order.items || [])
            .map((item) => ({
                productId: item.productId?.toString(),
                quantity: item.quantity,
                // Human-readable line label so a refusal names the exact SKU
                // the admin has to fix, not just "a product".
                label: item.sku ? `[${item.sku}] ${item.productName}` : item.productName,
            }))
            .filter((line): line is { productId: string; quantity: number; label: string } => Boolean(line.productId));
        const reserved = hasActiveReservation(order, from);
        let nextReservedFlag = reserved;

        // ━━━ Inventory effects — inside the same transaction as the commit. ━━━
        if (to === 'approved' && !reserved) {
            for (const line of lines) {
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await applyMovement({
                        productId: line.productId,
                        type: 'reserved',
                        quantity: line.quantity,
                        relatedOrderId: order._id,
                        actorId,
                        reason: 'order_approved',
                        session,
                    });
                } catch (err) {
                    throw new StockOperationError(
                        `Cannot approve: stock reservation failed for ${line.label} — ${(err as Error).message}`,
                    );
                }
            }
            nextReservedFlag = true;
        } else if (to === 'shipped') {
            for (const line of lines) {
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await applyShipLine(line, {
                        orderId: order._id,
                        actorId,
                        consumeReservation: reserved,
                        session,
                    });
                } catch (err) {
                    throw new StockOperationError(
                        `Cannot ship: stock deduction failed for ${line.label} — ${(err as Error).message}`,
                    );
                }
            }
            nextReservedFlag = false;
        } else if (from === 'approved' && (to === 'cancelled' || to === 'rejected' || to === 'pending') && reserved) {
            for (const line of lines) {
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await applyMovement({
                        productId: line.productId,
                        type: 'released',
                        quantity: line.quantity,
                        relatedOrderId: order._id,
                        actorId,
                        reason: 'order_cancelled',
                        session,
                    });
                } catch (err) {
                    // The transaction aborts: the order REMAINS approved with
                    // its reservation and inventoryReserved=true intact.
                    throw new StockOperationError(
                        `Cannot change status to '${to}': stock release failed for ${line.label} — ${(err as Error).message}`,
                    );
                }
            }
            nextReservedFlag = false;
        }

        // ━━━ Approval invoice — BEFORE the status commit, so a failed
        // invoice can never leave an approved order without one. ━━━
        let createdInvoiceId: mongoose.Types.ObjectId | null = null;
        if (to === 'approved') {
            const existing = await Invoice.findOne({ order: order._id }).select('_id').session(session ?? null);
            if (!existing) {
                try {
                    const [invoice] = await Invoice.create(
                        [{
                            company: order.company,
                            order: order._id,
                            invoiceNumber: generateInvoiceNumber(),
                            totalAmount: order.totalAmount,
                            status: 'draft',
                        }],
                        { session },
                    );
                    createdInvoiceId = invoice._id as mongoose.Types.ObjectId;
                } catch (err) {
                    const dup = err as { code?: number; keyPattern?: Record<string, unknown> };
                    // Duplicate on order → someone else committed one already.
                    if (!(dup.code === 11000 && dup.keyPattern && 'order' in dup.keyPattern)) {
                        throw new InvoiceCreationError((err as Error).message);
                    }
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
        try {
            await order.save({ session });
        } catch (err) {
            // Sessionless only: don't leave an invoice for a never-approved order.
            if (!session && createdInvoiceId) {
                await Invoice.deleteOne({ _id: createdInvoiceId }).catch((cleanupErr: unknown) => {
                    console.error(
                        `🚨 CRITICAL: could not remove invoice ${createdInvoiceId} after a failed `
                        + `approval commit for order ${order._id}: ${(cleanupErr as Error).message}`,
                    );
                });
            }
            throw err;
        }

        return order;
    } catch (err) {
        // Sessionless only: a transaction abort clears the lock by itself.
        if (!session) {
            await Order.updateOne({ _id: input.orderId }, { $unset: { statusLockAt: 1 } }).catch(() => undefined);
        }
        throw err;
    }
}

function refusalFrom(err: unknown): StatusChangeResult | null {
    if (err instanceof TransitionConflictError) return { ok: false, httpStatus: 409, error: err.message };
    if (err instanceof StockOperationError) return { ok: false, httpStatus: 409, error: err.message };
    if (err instanceof InvoiceCreationError) return { ok: false, httpStatus: 500, error: err.message };
    if (err instanceof TransactionsUnavailableError) {
        return {
            ok: false,
            httpStatus: 503,
            error: 'Order processing for stock-tracked products requires MongoDB transaction support '
                + '(replica set). The current database is standalone — see docs/deployment/mongo.md.',
        };
    }
    return null;
}

/**
 * Perform one status transition end-to-end. Returns the updated order or a
 * typed refusal ({httpStatus, error}) — it never leaves partial state.
 */
export async function changeOrderStatus(input: StatusChangeInput): Promise<StatusChangeResult> {
    const { expectedCurrentStatus: from, targetStatus: to } = input;

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

    const orderPre = await Order.findById(input.orderId);
    if (!orderPre) return { ok: false, httpStatus: 404, error: 'Order not found' };

    // A crashed retry (stale in-progress attempt still holding the order's
    // notification lease) must not block transitions forever — resolve it
    // to `unknown` first; FRESH leases still exclude us below.
    await reconcileNotificationLease(orderPre._id);

    if (to === 'approved') {
        // An approval sends the customer their selected payment
        // instructions — refuse while that method's config is unusable.
        if (orderPre.paymentPreference) {
            const settings = await Settings.findOne({ key: 'business' }).select('paymentOptions').lean();
            const configError = paymentConfigError(orderPre.paymentPreference, settings?.paymentOptions);
            if (configError) return { ok: false, httpStatus: 409, error: `Cannot approve: ${configError}` };
        }
        // "One invoice per order" is only true while the unique index
        // exists — refuse to approve rather than silently continue.
        const indexState = await invoiceIndexReadiness();
        if (!indexState.ready) {
            return {
                ok: false,
                httpStatus: 503,
                error: `Order approval is temporarily unavailable: ${indexState.reason}. `
                    + 'Fix the invoice data, then restart or re-run the readiness check.',
            };
        }
    }

    const trackedLines = await countTrackedLines(orderPre);
    const reservedPre = hasActiveReservation(orderPre, from);
    const involvesInventory = trackedLines > 0 && (
        (to === 'approved' && !reservedPre)
        || to === 'shipped'
        || (from === 'approved' && reservedPre && (to === 'cancelled' || to === 'rejected' || to === 'pending'))
    );

    try {
        if (involvesInventory) {
            // Stock-tracked lines: one REQUIRED transaction or an explicit 503.
            const order = await runRequiredTransaction((session) => performTransition(input, session));
            return { ok: true, order };
        }
        // No tracked stock involved: prefer a transaction, but the
        // sessionless ordering inside performTransition is safe on its own
        // (movement-log-only writes, invoice-first, explicit cleanup).
        const { result } = await withTransaction((session) => performTransition(input, session));
        return { ok: true, order: result };
    } catch (err) {
        const refusal = refusalFrom(err);
        if (refusal) return refusal;
        throw err;
    }
}
