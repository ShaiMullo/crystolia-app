// ===============================================
// 🔁 Inventory Reconciliation Service
// ===============================================
// Recomputes each product's reservedQuantity from the *actual* set of
// approved (un-shipped) orders, detects drift against the stored value,
// and optionally auto-fixes it. Designed to be callable from an admin
// action today and a scheduled job later — no cron infra is added here.

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import InventoryMovement from '../models/InventoryMovement.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import ReconciliationLog from '../models/ReconciliationLog.js';

export interface ReconciliationDiscrepancy {
    productId: string;
    productName: string;
    location: string;
    storedReserved: number;
    expectedReserved: number;
    drift: number; // expected - stored
}

export interface NegativeStockIssue {
    productId: string;
    location: string;
    quantity: number;
}

export interface InvoicePaymentMismatch {
    invoiceId: string;
    invoiceNumber: string;
    storedAmountPaid: number;
    actualAmountPaid: number;
}

export interface ImpossibleStateIssue {
    productId: string;
    location: string;
    quantity: number;
    reservedQuantity: number;
    reason: string;
}

export type ReconciliationSeverity = 'healthy' | 'warning' | 'critical';

export interface ReconciliationResult {
    scannedOrders: number;
    scannedInventoryRows: number;
    discrepancies: ReconciliationDiscrepancy[];
    negativeStock: NegativeStockIssue[];
    invoicePaymentMismatches: InvoicePaymentMismatch[];
    impossibleStates: ImpossibleStateIssue[];
    healthScore: number;          // 0–100
    severity: ReconciliationSeverity;
    fixed: boolean;
    ranAt: string;
}

/**
 * Health score: 100 minus weighted penalties, floored at 0.
 *  drift -2 · mismatch -5 · negative stock -10 · impossible state -12
 */
export function computeHealthScore(counts: {
    drift: number;
    mismatch: number;
    negative: number;
    impossible: number;
}): { score: number; severity: ReconciliationSeverity } {
    const penalty = counts.drift * 2 + counts.mismatch * 5 + counts.negative * 10 + counts.impossible * 12;
    const score = Math.max(0, 100 - penalty);
    const severity: ReconciliationSeverity = score >= 85 ? 'healthy' : score >= 50 ? 'warning' : 'critical';
    return { score, severity };
}

/**
 * Expected reservation = sum of quantities across all `approved` orders
 * (approved orders hold a soft reservation until they ship or cancel).
 */
async function computeExpectedReservations(): Promise<{ map: Map<string, number>; orderCount: number }> {
    const approved = await Order.find({ status: 'approved' }).select('items').lean();
    const map = new Map<string, number>();
    for (const order of approved) {
        for (const item of order.items || []) {
            if (!item.productId) continue;
            const key = item.productId.toString();
            map.set(key, (map.get(key) || 0) + (item.quantity || 0));
        }
    }
    return { map, orderCount: approved.length };
}

/**
 * @param autoFix  when true, drift is corrected on the Inventory rows and a
 *                 reconciliation InventoryMovement (type 'adjustment') is logged.
 * @param actorId  user id stamped on any movement records created.
 */
export async function reconcileInventory(autoFix: boolean, actorId?: string, logRun = true): Promise<ReconciliationResult> {
    const { map: expected, orderCount } = await computeExpectedReservations();

    const rows = await Inventory.find({})
        .populate('product', 'name stockTrackingEnabled isDeleted')
        .lean();

    const discrepancies: ReconciliationDiscrepancy[] = [];
    const negativeStock: NegativeStockIssue[] = [];
    const impossibleStates: ImpossibleStateIssue[] = [];

    for (const row of rows) {
        const product = row.product as unknown as { _id: mongoose.Types.ObjectId; name?: string; stockTrackingEnabled?: boolean; isDeleted?: boolean } | null;
        if (!product || product.isDeleted) continue;
        if (product.stockTrackingEnabled === false) continue;

        const key = product._id.toString();

        // Negative stock — should never happen; flag for manual review.
        if ((row.quantity || 0) < 0 || (row.reservedQuantity || 0) < 0) {
            negativeStock.push({ productId: key, location: row.location, quantity: row.quantity || 0 });
        }

        // Impossible state — more reserved than on-hand.
        if ((row.reservedQuantity || 0) > (row.quantity || 0)) {
            impossibleStates.push({
                productId: key,
                location: row.location,
                quantity: row.quantity || 0,
                reservedQuantity: row.reservedQuantity || 0,
                reason: 'reserved exceeds on-hand',
            });
        }

        // Reservation drift (also surfaces orphan reservations: stored > 0 but
        // no approved order ⇒ expected 0 ⇒ negative drift).
        const expectedReserved = expected.get(key) || 0;
        const storedReserved = row.reservedQuantity || 0;
        if (expectedReserved !== storedReserved) {
            discrepancies.push({
                productId: key,
                productName: product.name || '—',
                location: row.location,
                storedReserved,
                expectedReserved,
                drift: expectedReserved - storedReserved,
            });
        }
    }

    // Invoice ↔ payment mismatches: stored amountPaid vs sum of posted payments.
    const invoicePaymentMismatches: InvoicePaymentMismatch[] = [];
    const invoices = await Invoice.find({ status: { $ne: 'cancelled' } })
        .select('invoiceNumber amountPaid')
        .lean();
    for (const inv of invoices) {
        // eslint-disable-next-line no-await-in-loop
        const agg = await Payment.aggregate([
            { $match: { invoice: inv._id, status: 'posted' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const actual = Math.round(((agg[0]?.total || 0) + Number.EPSILON) * 100) / 100;
        const stored = Math.round(((inv.amountPaid || 0) + Number.EPSILON) * 100) / 100;
        if (actual !== stored) {
            invoicePaymentMismatches.push({
                invoiceId: inv._id.toString(),
                invoiceNumber: inv.invoiceNumber,
                storedAmountPaid: stored,
                actualAmountPaid: actual,
            });
        }
    }

    if (autoFix) {
        for (const d of discrepancies) {
            // eslint-disable-next-line no-await-in-loop
            await Inventory.updateOne(
                { product: d.productId, location: d.location },
                { $set: { reservedQuantity: d.expectedReserved, lastMovementAt: new Date() } },
            );
            // eslint-disable-next-line no-await-in-loop
            await InventoryMovement.create({
                product: d.productId,
                location: d.location,
                type: 'adjustment',
                quantity: d.expectedReserved,
                reason: `reconciliation: reserved ${d.storedReserved} → ${d.expectedReserved}`,
                createdBy: actorId,
            });
        }
        // Fix invoice payment mismatches: stored amountPaid is corrected to actual.
        for (const m of invoicePaymentMismatches) {
            // eslint-disable-next-line no-await-in-loop
            await Invoice.updateOne({ _id: m.invoiceId }, { $set: { amountPaid: m.actualAmountPaid } });
        }
    }

    const totalIssues =
        discrepancies.length + negativeStock.length + invoicePaymentMismatches.length + impossibleStates.length;

    const { score: healthScore, severity } = computeHealthScore({
        drift: discrepancies.length,
        mismatch: invoicePaymentMismatches.length,
        negative: negativeStock.length,
        impossible: impossibleStates.length,
    });

    // Persist a durable reconciliation history entry — but not for clean
    // read-only health checks, to keep the history meaningful.
    if (logRun && (autoFix || totalIssues > 0)) {
        try {
            await ReconciliationLog.create({
                ranBy: actorId,
                autoFix,
                scannedOrders: orderCount,
                scannedInventoryRows: rows.length,
                reservationDriftCount: discrepancies.length,
                negativeStockCount: negativeStock.length,
                invoicePaymentMismatchCount: invoicePaymentMismatches.length,
                impossibleStateCount: impossibleStates.length,
                healthScore,
                severity,
                fixed: autoFix && totalIssues > 0,
                summary: {
                    discrepancies: discrepancies.length,
                    negativeStock: negativeStock.length,
                    mismatches: invoicePaymentMismatches.length,
                    impossibleStates: impossibleStates.length,
                },
            });
        } catch (err) {
            console.error('reconciliation log write failed:', err);
        }
    }

    return {
        scannedOrders: orderCount,
        scannedInventoryRows: rows.length,
        discrepancies,
        negativeStock,
        invoicePaymentMismatches,
        impossibleStates,
        healthScore,
        severity,
        fixed: autoFix && totalIssues > 0,
        ranAt: new Date().toISOString(),
    };
}

/** Convenience: count issues without mutating anything. Cheap health check. */
export async function reconciliationStatus(): Promise<{
    driftCount: number;
    issueCount: number;
    negativeStockCount: number;
    impossibleStateCount: number;
    mismatchCount: number;
    healthScore: number;
    severity: ReconciliationSeverity;
    ranAt: string;
}> {
    const result = await reconcileInventory(false, undefined, false);
    const issueCount =
        result.discrepancies.length +
        result.negativeStock.length +
        result.invoicePaymentMismatches.length +
        result.impossibleStates.length;
    return {
        driftCount: result.discrepancies.length,
        issueCount,
        negativeStockCount: result.negativeStock.length,
        impossibleStateCount: result.impossibleStates.length,
        mismatchCount: result.invoicePaymentMismatches.length,
        healthScore: result.healthScore,
        severity: result.severity,
        ranAt: result.ranAt,
    };
}

/** Reconciliation run history (newest first). */
export async function reconciliationHistory(limit = 20) {
    return ReconciliationLog.find({})
        .sort({ createdAt: -1 })
        .limit(Math.min(100, limit))
        .lean();
}
