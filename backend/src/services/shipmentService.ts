// ===============================================
// 🚚 Shipment Service
// ===============================================
// Shipment completion (delivery) is wrapped in an optional transaction
// so the Shipment status update and the Order status update commit together.

import mongoose from 'mongoose';
import Shipment, { ShipmentStatus } from '../models/Shipment.js';
import Order from '../models/Order.js';
import { withTransaction } from '../db/withTransaction.js';

export interface ShipmentStatusChangeResult {
    status: ShipmentStatus;
    transactional: boolean;
}

/**
 * Move a shipment to a new status. When delivered, the parent order is
 * advanced to 'completed' in the same transaction.
 */
export async function changeShipmentStatus(
    shipmentId: string | mongoose.Types.ObjectId,
    status: ShipmentStatus,
    actorId?: string,
): Promise<ShipmentStatusChangeResult> {
    const { result, transactional } = await withTransaction(async (session) => {
        const shipment = await Shipment.findById(shipmentId).session(session ?? null);
        if (!shipment) throw new Error('Shipment not found');

        const now = new Date();
        const from = shipment.status;
        shipment.status = status;
        if (status === 'shipped' && !shipment.shippedAt) shipment.shippedAt = now;
        if (status === 'delivered' && !shipment.deliveredAt) shipment.deliveredAt = now;
        shipment.timeline.push({ type: 'status_changed', at: now, actorId, meta: { from, to: status } });
        await shipment.save({ session });

        // On delivery, mark the order completed (best-effort, same txn).
        if (status === 'delivered') {
            const order = await Order.findById(shipment.order).session(session ?? null);
            if (order && order.status !== 'completed' && order.status !== 'cancelled') {
                order.status = 'completed';
                order.timeline.push({
                    type: 'status_changed',
                    at: now,
                    actorId,
                    meta: { from: order.status, to: 'completed', via: 'shipment_delivered' },
                });
                await order.save({ session });
            }
        }

        return { status };
    });

    return { ...result, transactional };
}
