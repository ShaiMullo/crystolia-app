// ===============================================
// 📥 Purchase Order Service
// ===============================================
// Receiving stock against a PO is transaction-safe: the PO item
// updates, the PO status change, and every inventory `in` movement
// commit together (or all fall back together).

import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { runRequiredTransaction } from '../db/withTransaction.js';
import { applyMovement } from './inventoryService.js';

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePoTotal(items: Array<{ quantity: number; unitCost: number }>): number {
    return round2(items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0));
}

export interface ReceiptLine {
    productId: string;
    quantity: number;
}

export interface ReceiveResult {
    status: string;
    received: Array<{ productId: string; quantity: number }>;
    transactional: boolean;
}

/**
 * Receive quantities against a PO. Each received line increments the PO
 * item's receivedQuantity and applies an inventory `in` movement.
 * PO status becomes `received` (all lines complete) or `partially_received`.
 */
export async function receivePurchaseOrder(
    poId: string | mongoose.Types.ObjectId,
    receipts: ReceiptLine[],
    actorId?: string,
): Promise<ReceiveResult> {
    // Production stock mutation — receiving increments PO lines AND writes
    // inventory in/movement records; all of it commits in ONE transaction
    // or not at all. Standalone deployments get an operational 503
    // (TransactionsUnavailableError) with the PO and inventory untouched.
    const result = await runRequiredTransaction(async (session) => {
        const po = await PurchaseOrder.findById(poId).session(session ?? null);
        if (!po) throw new Error('Purchase order not found');
        if (po.status === 'cancelled') throw new Error('Cannot receive a cancelled purchase order');
        if (po.status === 'received') throw new Error('Purchase order is already fully received');

        const now = new Date();
        const applied: Array<{ productId: string; quantity: number }> = [];

        for (const receipt of receipts) {
            if (!receipt.quantity || receipt.quantity <= 0) continue;
            const item = po.items.find((i) => i.product.toString() === receipt.productId);
            if (!item) throw new Error(`Product ${receipt.productId} is not on this purchase order`);

            const outstanding = item.quantity - item.receivedQuantity;
            if (receipt.quantity > outstanding) {
                throw new Error(`Cannot receive ${receipt.quantity} of ${item.productName}; only ${outstanding} outstanding`);
            }

            item.receivedQuantity += receipt.quantity;

            // eslint-disable-next-line no-await-in-loop
            await applyMovement({
                productId: item.product,
                type: 'in',
                quantity: receipt.quantity,
                reason: `PO ${po.poNumber} receiving`,
                actorId,
                session,
            });

            applied.push({ productId: receipt.productId, quantity: receipt.quantity });
        }

        const allReceived = po.items.every((i) => i.receivedQuantity >= i.quantity);
        const anyReceived = po.items.some((i) => i.receivedQuantity > 0);
        po.status = allReceived ? 'received' : anyReceived ? 'partially_received' : po.status;
        if (allReceived) po.receivedAt = now;
        po.timeline.push({ type: 'stock_received', at: now, actorId, meta: { lines: applied.length } });
        await po.save({ session });

        return { status: po.status, received: applied };
    });

    // Receiving only ever runs transactionally now (runRequiredTransaction).
    return { ...result, transactional: true };
}
