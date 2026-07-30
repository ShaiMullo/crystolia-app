// ===============================================
// 📊 Inventory Service
// ===============================================
// Single entry point for stock changes. Always writes both the Inventory
// summary row AND an InventoryMovement record so the log stays in sync.

import mongoose, { ClientSession } from 'mongoose';
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
    /** Optional Mongo session — when present, all writes join that transaction. */
    session?: ClientSession;
}

async function getOrCreateInventoryRow(
    productId: mongoose.Types.ObjectId,
    location: string,
    session?: ClientSession,
) {
    // Atomic get-or-create on the unique (product, location) index so two
    // concurrent FIRST movements cannot both insert. A lost upsert race
    // surfaces as a duplicate-key error; the retry then reads the winner's row.
    try {
        const row = await Inventory.findOneAndUpdate(
            { product: productId, location },
            { $setOnInsert: { product: productId, location } },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        ).session(session ?? null);
        if (row) return row;
    } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
    }
    const row = await Inventory.findOne({ product: productId, location }).session(session ?? null);
    if (!row) throw new Error('Inventory row lookup failed after upsert');
    return row;
}

export async function applyMovement(input: MovementInput) {
    if (input.quantity < 0) throw new Error('quantity must be non-negative');
    if (input.quantity === 0 && input.type !== 'adjustment') {
        throw new Error('quantity must be positive');
    }
    const productId = typeof input.productId === 'string'
        ? new mongoose.Types.ObjectId(input.productId)
        : input.productId;
    const location = input.location || 'main';
    const now = new Date();
    const session = input.session;

    // If the product opts out of stock tracking, log the movement only.
    const product = await Product.findById(productId).select('stockTrackingEnabled isDeleted').session(session ?? null);
    if (!product || product.isDeleted) {
        throw new Error('Product not found');
    }

    let row = await getOrCreateInventoryRow(productId, location, session);

    if (product.stockTrackingEnabled) {
        // Every mutation is a single conditional findOneAndUpdate so two
        // concurrent movements can never both pass a read-time availability
        // check and oversell — the guard lives in the query filter itself.
        const match = { product: productId, location };
        const hasAvailable = {
            $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, input.quantity] },
        };
        const opts = { new: true, session: session ?? null };
        let updated = null;

        if (input.type === 'in') {
            updated = await Inventory.findOneAndUpdate(
                match,
                { $inc: { quantity: input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
        } else if (input.type === 'out') {
            updated = await Inventory.findOneAndUpdate(
                { ...match, ...hasAvailable },
                { $inc: { quantity: -input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!updated) throw new Error('Insufficient available stock');
        } else if (input.type === 'adjustment') {
            // adjustment quantity is the NEW on-hand value
            updated = await Inventory.findOneAndUpdate(
                match,
                { $set: { quantity: input.quantity, lastMovementAt: now } },
                opts,
            );
        } else if (input.type === 'reserved') {
            updated = await Inventory.findOneAndUpdate(
                { ...match, ...hasAvailable },
                { $inc: { reservedQuantity: input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!updated) throw new Error('Insufficient available stock to reserve');
        } else if (input.type === 'released') {
            // Pipeline update so the at-zero clamp is atomic too.
            updated = await Inventory.findOneAndUpdate(
                match,
                [{
                    $set: {
                        reservedQuantity: {
                            $max: [0, { $subtract: ['$reservedQuantity', input.quantity] }],
                        },
                        lastMovementAt: now,
                    },
                }],
                opts,
            );
        }

        if (!updated) throw new Error('Inventory row update failed');
        row = updated;
    }

    const [movement] = await InventoryMovement.create(
        [{
            product: productId,
            location,
            type: input.type,
            quantity: input.quantity,
            reason: input.reason,
            relatedOrder: input.relatedOrderId,
            createdBy: input.actorId,
        }],
        { session },
    );

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

/** One failed stock movement for an order line. Callers surface these on the
 *  order timeline and as admin notifications instead of losing them. */
export interface OrderMovementFailure {
    productId: string;
    quantity: number;
    error: string;
}

async function movementForItem(
    item: { productId?: string; quantity: number },
    input: Omit<MovementInput, 'productId' | 'quantity'>,
): Promise<OrderMovementFailure | null> {
    if (!item.productId) return null;
    try {
        await applyMovement({ ...input, productId: item.productId, quantity: item.quantity });
        return null;
    } catch (err) {
        const error = (err as Error).message;
        console.error('inventory movement skipped:', error);
        return { productId: item.productId, quantity: item.quantity, error };
    }
}

export async function reserveForOrder(
    orderId: string | mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>,
    actorId?: string,
): Promise<OrderMovementFailure[]> {
    const failures: OrderMovementFailure[] = [];
    for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const failure = await movementForItem(item, {
            type: 'reserved',
            relatedOrderId: orderId,
            actorId,
            reason: 'order_approved',
        });
        if (failure) failures.push(failure);
    }
    return failures;
}

export async function releaseForOrder(
    orderId: string | mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>,
    actorId?: string,
): Promise<OrderMovementFailure[]> {
    const failures: OrderMovementFailure[] = [];
    for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const failure = await movementForItem(item, {
            type: 'released',
            relatedOrderId: orderId,
            actorId,
            reason: 'order_cancelled',
        });
        if (failure) failures.push(failure);
    }
    return failures;
}

export async function shipForOrder(
    orderId: string | mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>,
    actorId?: string,
): Promise<OrderMovementFailure[]> {
    const failures: OrderMovementFailure[] = [];
    for (const item of items) {
        // Release the reservation first, then deduct on-hand.
        // eslint-disable-next-line no-await-in-loop
        await movementForItem(item, {
            type: 'released',
            relatedOrderId: orderId,
            actorId,
            reason: 'order_shipped_release',
        });
        // eslint-disable-next-line no-await-in-loop
        const failure = await movementForItem(item, {
            type: 'out',
            relatedOrderId: orderId,
            actorId,
            reason: 'order_shipped',
        });
        if (failure) failures.push(failure);
    }
    return failures;
}
