// ===============================================
// 📊 Inventory Service
// ===============================================
// Single entry point for stock changes. Always writes both the Inventory
// summary row AND an InventoryMovement record so the log stays in sync.

import mongoose, { ClientSession } from 'mongoose';
import Inventory from '../models/Inventory.js';
import InventoryMovement, { MovementType } from '../models/InventoryMovement.js';
import Product from '../models/Product.js';
import { withTransaction } from '../db/withTransaction.js';

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

export type AllOrNothingResult =
    | { ok: true; transactional: boolean }
    | { ok: false; error: string; failedProductId?: string };

/**
 * Reserve stock for EVERY line of an order, or nothing at all.
 *
 * On a replica set the lines run inside one Mongo transaction, so a failure
 * aborts every write. On a standalone mongod (transactions unsupported)
 * the lines run sequentially and a failure triggers explicit compensation:
 * each already-reserved line is released, with a paired
 * `reservation_compensation` movement record so the Inventory summary and
 * the InventoryMovement log never diverge.
 *
 * Lines without a productId (legacy boxPrices SKUs) and products with
 * stockTrackingEnabled=false never block — applyMovement handles them.
 */
export async function reserveAllForOrder(
    orderId: string | mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>,
    actorId?: string,
): Promise<AllOrNothingResult> {
    const lines = items.filter((i) => i.productId);
    if (lines.length === 0) return { ok: true, transactional: false };

    try {
        const { result, transactional } = await withTransaction(async (session) => {
            const done: typeof lines = [];
            try {
                for (const line of lines) {
                    // eslint-disable-next-line no-await-in-loop
                    await applyMovement({
                        productId: line.productId!,
                        type: 'reserved',
                        quantity: line.quantity,
                        relatedOrderId: orderId,
                        actorId,
                        reason: 'order_approved',
                        session,
                    });
                    done.push(line);
                }
                return { ok: true as const };
            } catch (err) {
                // Inside a transaction the abort undoes everything.
                if (session) throw err;
                // Standalone fallback: compensate the lines that DID reserve.
                for (const line of done) {
                    // eslint-disable-next-line no-await-in-loop
                    await applyMovement({
                        productId: line.productId!,
                        type: 'released',
                        quantity: line.quantity,
                        relatedOrderId: orderId,
                        actorId,
                        reason: 'reservation_compensation',
                    }).catch((compErr: unknown) => {
                        console.error(
                            `❌ reservation compensation failed for product ${line.productId}:`,
                            (compErr as Error).message,
                        );
                    });
                }
                return {
                    ok: false as const,
                    error: (err as Error).message,
                    failedProductId: undefined,
                };
            }
        });
        if (!result.ok) return result;
        return { ok: true, transactional };
    } catch (err) {
        // Transactional path aborted on a business error (e.g. insufficient
        // stock) — nothing was written.
        return { ok: false, error: (err as Error).message };
    }
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

interface ShipLineContext {
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
 * leak the reservation.
 */
async function applyShipLine(line: { productId: string; quantity: number }, ctx: ShipLineContext) {
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

/** Standalone-fallback inverse of applyShipLine (best-effort emergency path). */
async function compensateShipLine(line: { productId: string; quantity: number }, ctx: ShipLineContext) {
    const productId = new mongoose.Types.ObjectId(line.productId);
    const location = 'main';
    const inc: Record<string, number> = { quantity: line.quantity };
    if (ctx.consumeReservation) inc.reservedQuantity = line.quantity;
    await Inventory.updateOne(
        { product: productId, location },
        { $inc: inc, $set: { lastMovementAt: new Date() } },
    );
    const movements = ctx.consumeReservation
        ? [
            { type: 'in', reason: 'ship_compensation' },
            { type: 'reserved', reason: 'ship_compensation' },
        ]
        : [{ type: 'in', reason: 'ship_compensation' }];
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
    );
}

/**
 * Ship EVERY line of an order, or nothing at all — same
 * transaction/compensation strategy as reserveAllForOrder. On failure the
 * order's reservation is left intact, so the order can stay `approved`.
 */
export async function shipAllForOrder(
    orderId: string | mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>,
    actorId: string | undefined,
    consumeReservation: boolean,
): Promise<AllOrNothingResult> {
    const lines = items.filter((i): i is { productId: string; quantity: number } => Boolean(i.productId));
    if (lines.length === 0) return { ok: true, transactional: false };

    try {
        const { result, transactional } = await withTransaction(async (session) => {
            const ctx: ShipLineContext = { orderId, actorId, consumeReservation, session };
            const done: typeof lines = [];
            try {
                for (const line of lines) {
                    // eslint-disable-next-line no-await-in-loop
                    await applyShipLine(line, ctx);
                    done.push(line);
                }
                return { ok: true as const };
            } catch (err) {
                if (session) throw err;
                for (const line of done) {
                    // eslint-disable-next-line no-await-in-loop
                    await compensateShipLine(line, { ...ctx, session: undefined }).catch((compErr: unknown) => {
                        console.error(
                            `❌ ship compensation failed for product ${line.productId}:`,
                            (compErr as Error).message,
                        );
                    });
                }
                return { ok: false as const, error: (err as Error).message };
            }
        });
        if (!result.ok) return result;
        return { ok: true, transactional };
    } catch (err) {
        return { ok: false, error: (err as Error).message };
    }
}
