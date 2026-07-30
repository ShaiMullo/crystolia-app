// ===============================================
// 📊 Inventory Service
// ===============================================
// Single entry point for stock changes. Always writes both the Inventory
// summary row AND an InventoryMovement record so the log stays in sync.
//
// Consistency model:
//  * Every summary mutation is a single conditional findOneAndUpdate —
//    availability guards live in the query filter, so concurrent movements
//    can never both pass a read-time check and oversell.
//  * With a session, summary + movement join the caller's transaction.
//  * WITHOUT a session, a failed movement-log write triggers an EXACT
//    revert of the summary change (computed from the pre-image), so the
//    summary and the log cannot diverge even on the standalone path.
//  * Multi-line order flows (reserve/ship every line or none) do NOT live
//    here — they require a real transaction and are orchestrated by
//    orderStatusService via runRequiredTransaction.

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
    // Exact inverse of the summary change, used ONLY on the sessionless
    // path when the movement-log write fails after the summary applied.
    let revertUpdate: Record<string, unknown> | null = null;

    if (product.stockTrackingEnabled) {
        const match = { product: productId, location };
        const hasAvailable = {
            $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, input.quantity] },
        };
        // `new: false` returns the PRE-image so the revert (and the returned
        // post values) can be computed exactly — including the released
        // clamp, whose inverse depends on the prior reservedQuantity.
        const opts = { new: false, session: session ?? null };
        let pre = null;

        if (input.type === 'in') {
            pre = await Inventory.findOneAndUpdate(
                match,
                { $inc: { quantity: input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!pre) throw new Error('Inventory row update failed');
            revertUpdate = { $inc: { quantity: -input.quantity } };
            row = pre;
            row.quantity = pre.quantity + input.quantity;
        } else if (input.type === 'out') {
            pre = await Inventory.findOneAndUpdate(
                { ...match, ...hasAvailable },
                { $inc: { quantity: -input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!pre) throw new Error('Insufficient available stock');
            revertUpdate = { $inc: { quantity: input.quantity } };
            row = pre;
            row.quantity = pre.quantity - input.quantity;
        } else if (input.type === 'adjustment') {
            // adjustment quantity is the NEW on-hand value
            pre = await Inventory.findOneAndUpdate(
                match,
                { $set: { quantity: input.quantity, lastMovementAt: now } },
                opts,
            );
            if (!pre) throw new Error('Inventory row update failed');
            revertUpdate = { $set: { quantity: pre.quantity } };
            row = pre;
            row.quantity = input.quantity;
        } else if (input.type === 'reserved') {
            pre = await Inventory.findOneAndUpdate(
                { ...match, ...hasAvailable },
                { $inc: { reservedQuantity: input.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!pre) throw new Error('Insufficient available stock to reserve');
            revertUpdate = { $inc: { reservedQuantity: -input.quantity } };
            row = pre;
            row.reservedQuantity = pre.reservedQuantity + input.quantity;
        } else if (input.type === 'released') {
            // Pipeline update so the at-zero clamp is atomic too.
            pre = await Inventory.findOneAndUpdate(
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
            if (!pre) throw new Error('Inventory row update failed');
            const postReserved = Math.max(0, pre.reservedQuantity - input.quantity);
            revertUpdate = { $inc: { reservedQuantity: pre.reservedQuantity - postReserved } };
            row = pre;
            row.reservedQuantity = postReserved;
        }
        row.lastMovementAt = now;
    }

    let movement;
    try {
        [movement] = await InventoryMovement.create(
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
    } catch (err) {
        // Inside a transaction the abort restores the summary. Outside one,
        // revert the summary change exactly so summary and log never diverge.
        if (!session && revertUpdate) {
            await Inventory.updateOne({ product: productId, location }, revertUpdate).catch((revertErr: unknown) => {
                console.error(
                    `🚨 CRITICAL: inventory revert failed for product ${productId} @ ${location} — `
                    + `summary and movement log have diverged: ${(revertErr as Error).message}`,
                );
            });
        }
        throw err;
    }

    return { inventory: row, movement };
}

export interface ShipLineContext {
    orderId: string | mongoose.Types.ObjectId;
    actorId?: string;
    /** True when the order holds an active reservation to consume. */
    consumeReservation: boolean;
    session?: ClientSession;
}

/**
 * Ship one line ATOMICALLY: consuming the reservation and deducting
 * on-hand happens in a single conditional update — never the old
 * "release, then separately deduct" pair, which could fail in between and
 * leak the reservation. Order-level all-or-nothing across lines is the
 * caller's responsibility (orderStatusService runs this in a required
 * transaction).
 */
export async function applyShipLine(line: { productId: string; quantity: number }, ctx: ShipLineContext) {
    const productId = new mongoose.Types.ObjectId(line.productId);
    const location = 'main';
    const now = new Date();
    const opts = { new: true, session: ctx.session ?? null };

    const product = await Product.findById(productId)
        .select('stockTrackingEnabled isDeleted')
        .session(ctx.session ?? null);
    if (!product || product.isDeleted) throw new Error('Product not found');

    if (product.stockTrackingEnabled) {
        let updated = null;
        if (ctx.consumeReservation) {
            updated = await Inventory.findOneAndUpdate(
                {
                    product: productId,
                    location,
                    reservedQuantity: { $gte: line.quantity },
                    quantity: { $gte: line.quantity },
                },
                {
                    $inc: { quantity: -line.quantity, reservedQuantity: -line.quantity },
                    $set: { lastMovementAt: now },
                },
                opts,
            );
            if (!updated) throw new Error('Insufficient reserved stock to ship');
        } else {
            updated = await Inventory.findOneAndUpdate(
                {
                    product: productId,
                    location,
                    $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, line.quantity] },
                },
                { $inc: { quantity: -line.quantity }, $set: { lastMovementAt: now } },
                opts,
            );
            if (!updated) throw new Error('Insufficient available stock');
        }
    }

    // Movement log mirrors the summary change (released+out when a
    // reservation was consumed, out otherwise).
    const movements = ctx.consumeReservation
        ? [
            { type: 'released', reason: 'order_shipped_release' },
            { type: 'out', reason: 'order_shipped' },
        ]
        : [{ type: 'out', reason: 'order_shipped' }];
    await InventoryMovement.create(
        movements.map((m) => ({
            product: productId,
            location,
            type: m.type,
            quantity: line.quantity,
            reason: m.reason,
            relatedOrder: ctx.orderId,
            createdBy: ctx.actorId,
        })),
        { session: ctx.session, ordered: true },
    );
}
