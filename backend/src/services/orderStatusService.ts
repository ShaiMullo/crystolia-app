// ===============================================
// 📦 Order status transitions & inventory side-effects
// ===============================================
// One shared implementation for BOTH admin order surfaces
// (routes/orders.ts PATCH and routes/crmOrders.ts PATCH) so the transition
// rules and stock side-effects can never drift between them.

import type { IOrder } from '../models/Order.js';
import { reserveForOrder, releaseForOrder, shipForOrder, type OrderMovementFailure } from './inventoryService.js';
import { notifyAdmins } from './notificationService.js';

export type OrderStatus = IOrder['status'];

// Explicit state machine. Any pair not listed here is rejected — before
// this map existed, every status was reachable from every status, which
// allowed nonsense like completed→pending and double-reserving stock via
// approved→pending→approved. Reopen paths (→pending) are kept so an admin
// can undo a mistaken decision before shipment.
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
 * status is the best available signal, which exactly reproduces the old
 * behavior. New orders track the flag explicitly, which makes reserve/
 * release idempotent across reopen/re-approve cycles.
 */
function hasActiveReservation(order: IOrder, previousStatus: OrderStatus): boolean {
    if (typeof order.inventoryReserved === 'boolean') return order.inventoryReserved;
    return previousStatus === 'approved';
}

/**
 * Apply stock side-effects for a status change and record any failures on
 * the order document (timeline + inventoryReserved flag). Failures never
 * block the status change (production may not have Inventory rows yet), but
 * they are no longer silent: each one lands on the order timeline and as an
 * admin in-app notification. The caller is responsible for saving `order`.
 */
export async function applyInventorySideEffects(
    order: IOrder,
    previousStatus: OrderStatus,
    actorId?: string,
): Promise<OrderMovementFailure[]> {
    const status = order.status;
    const items = (order.items || []).map((item) => ({
        productId: item.productId?.toString(),
        quantity: item.quantity,
    }));
    const reserved = hasActiveReservation(order, previousStatus);
    let failures: OrderMovementFailure[] = [];

    if (status === 'approved' && previousStatus !== 'approved') {
        if (!reserved) {
            failures = await reserveForOrder(order._id, items, actorId);
            order.inventoryReserved = true;
        }
    } else if (previousStatus === 'approved' && (status === 'cancelled' || status === 'rejected' || status === 'pending')) {
        if (reserved) {
            failures = await releaseForOrder(order._id, items, actorId);
            order.inventoryReserved = false;
        }
    } else if (status === 'shipped' && previousStatus !== 'shipped' && previousStatus !== 'completed') {
        failures = await shipForOrder(order._id, items, actorId);
        order.inventoryReserved = false;
    }

    if (failures.length > 0) {
        order.timeline.push({
            type: 'inventory_movement_failed',
            at: new Date(),
            actorId,
            meta: { status, failures },
        });
        await notifyAdmins({
            type: 'inventory_reservation_failed',
            entityId: `${order._id.toString()}:${status}`,
            title: `Stock movement failed for order ${order._id.toString().slice(-8)}`,
            body: failures.map((f) => `${f.quantity}× product ${f.productId}: ${f.error}`).join('; ').slice(0, 500),
            link: `/admin/orders/${order._id.toString()}`,
            icon: '⚠️',
        }).catch(() => undefined);
    }

    return failures;
}
