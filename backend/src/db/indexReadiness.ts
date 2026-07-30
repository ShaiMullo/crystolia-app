// ===============================================
// 🧱 Critical-index readiness
// ===============================================
// The order-approval workflow claims "exactly one invoice per order" —
// that claim is only true while the unique partial index on Invoice.order
// actually exists. If the index cannot be built (e.g. legacy duplicate
// invoices in production), the system must SAY so — surfaced on
// /api/ready and enforced by refusing approvals — instead of silently
// continuing with a find-then-create that is not a concurrency guarantee.

import Invoice from '../models/Invoice.js';

export interface IndexReadiness {
    ready: boolean;
    /** Stable machine-readable code — safe to expose on /api/ready. */
    code?: string;
    /** Sanitized human hint — NEVER contains raw driver errors. */
    reason?: string;
}

let cached: IndexReadiness | null = null;
let inFlight: Promise<IndexReadiness> | null = null;

async function checkNow(): Promise<IndexReadiness> {
    try {
        // Build the schema-declared indexes (throws on duplicate data), then
        // verify the unique partial index on `order` is genuinely present.
        await Invoice.init();
        await Invoice.createIndexes();
        const indexes = await Invoice.collection.indexes();
        const orderIndex = indexes.find(
            (idx) => idx.unique === true
                && idx.partialFilterExpression
                && Object.keys(idx.key).length === 1
                && idx.key.order === 1,
        );
        if (!orderIndex) {
            return {
                ready: false,
                code: 'INVOICE_ORDER_INDEX_MISSING',
                reason: 'The invoice uniqueness index is missing — see server logs',
            };
        }
        return { ready: true };
    } catch (err) {
        // The raw driver error can contain index names, duplicate key VALUES
        // and database identifiers — log it server-side, expose a stable
        // sanitized code/message only.
        console.error('🚨 Invoice.order unique index build failed:', (err as Error).message);
        return {
            ready: false,
            code: 'INVOICE_ORDER_INDEX_UNAVAILABLE',
            reason: 'The invoice uniqueness index could not be built (likely duplicate legacy invoices) — see server logs',
        };
    }
}

/** Cached readiness (first call performs the check). */
export async function invoiceIndexReadiness(): Promise<IndexReadiness> {
    if (cached) return cached;
    if (!inFlight) {
        inFlight = checkNow().then((result) => {
            cached = result;
            inFlight = null;
            return result;
        });
    }
    return inFlight;
}

/** Force a fresh check — used at boot and by tests/operations after fixing data. */
export async function recheckInvoiceIndexReadiness(): Promise<IndexReadiness> {
    cached = null;
    inFlight = null;
    return invoiceIndexReadiness();
}
