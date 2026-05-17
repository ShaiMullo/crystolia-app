// ===============================================
// 📊 Inventory Service
// ===============================================
// Single entry point for stock changes. Always writes both the Inventory
// summary row AND an InventoryMovement record so the log stays in sync.

import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import InventoryMovement, { MovementType } from '../models/InventoryMovement.js';
import Product from '../models/Product.js';

export interface MovementInput {
    productId: string | mongoose.Types.ObjectId;
    location?: string;
    type: MovementType;
    quantity: number;
    reason?: string;
    relatedOrderId?: string | mongoose.Types.ObjectId;
    actorId?: string | mongoose.Types.ObjectId;
}

async function getOrCreateInventoryRow(productId: mongoose.Types.ObjectId, location: string) {
    let row = await Inventory.findOne({ product: productId, location });
    if (!row) {
        row = await Inventory.create({ product: productId, location });
    }
    return row;
}

export async function applyMovement(input: MovementInput) {
    if (input.quantity <= 0) throw new Error('quantity must be positive');
    const productId = typeof input.productId === 'string'
        ? new mongoose.Types.ObjectId(input.productId)
        : input.productId;
    const location = input.location || 'main';
    const now = new Date();

    // If the product opts out of stock tracking, log the movement only.
    const product = await Product.findById(productId).select('stockTrackingEnabled isDeleted');
    if (!product || product.isDeleted) {
        throw new Error('Product not found');
    }

    const row = await getOrCreateInventoryRow(productId, location);

    if (product.stockTrackingEnabled) {
        if (input.type === 'in') {
            row.quantity += input.quantity;
        } else if (input.type === 'out') {
            if (row.quantity - row.reservedQuantity < input.quantity) {
                throw new Error('Insufficient available stock');
            }
            row.quantity -= input.quantity;
        } else if (input.type === 'adjustment') {
            // adjustment quantity is the NEW on-hand value
            row.quantity = input.quantity;
        } else if (input.type === 'reserved') {
            if (row.quantity - row.reservedQuantity < input.quantity) {
                throw new Error('Insufficient available stock to reserve');
            }
            row.reservedQuantity += input.quantity;
        } else if (input.type === 'released') {
            row.reservedQuantity = Math.max(0, row.reservedQuantity - input.quantity);
        }
        row.lastMovementAt = now;
        await row.save();
    }

    const movement = await InventoryMovement.create({
        product: productId,
        location,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        relatedOrder: input.relatedOrderId,
        createdBy: input.actorId,
    });

    return { inventory: row, movement };
}

/** Best-effort: never throw on the caller's path. Used by order side-effects. */
export async function safeApplyMovement(input: MovementInput) {
    try {
        return await applyMovement(input);
    } catch (err) {
        console.error('inventory movement skipped:', (err as Error).message);
        return null;
    }
}

export async function reserveForOrder(orderId: string | mongoose.Types.ObjectId, items: Array<{ productId?: string; quantity: number }>, actorId?: string) {
    for (const item of items) {
        if (!item.productId) continue;
        // eslint-disable-next-line no-await-in-loop
        await safeApplyMovement({
            productId: item.productId,
            type: 'reserved',
            quantity: item.quantity,
            relatedOrderId: orderId,
            actorId,
            reason: 'order_approved',
        });
    }
}

export async function releaseForOrder(orderId: string | mongoose.Types.ObjectId, items: Array<{ productId?: string; quantity: number }>, actorId?: string) {
    for (const item of items) {
        if (!item.productId) continue;
        // eslint-disable-next-line no-await-in-loop
        await safeApplyMovement({
            productId: item.productId,
            type: 'released',
            quantity: item.quantity,
            relatedOrderId: orderId,
            actorId,
            reason: 'order_cancelled',
        });
    }
}

export async function shipForOrder(orderId: string | mongoose.Types.ObjectId, items: Array<{ productId?: string; quantity: number }>, actorId?: string) {
    for (const item of items) {
        if (!item.productId) continue;
        // Release the reservation first, then deduct on-hand.
        // eslint-disable-next-line no-await-in-loop
        await safeApplyMovement({
            productId: item.productId,
            type: 'released',
            quantity: item.quantity,
            relatedOrderId: orderId,
            actorId,
            reason: 'order_shipped_release',
        });
        // eslint-disable-next-line no-await-in-loop
        await safeApplyMovement({
            productId: item.productId,
            type: 'out',
            quantity: item.quantity,
            relatedOrderId: orderId,
            actorId,
            reason: 'order_shipped',
        });
    }
}
