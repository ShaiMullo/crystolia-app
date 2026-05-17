// ===============================================
// 🔐 Optional Mongo Transaction Helper
// ===============================================
// Runs a unit of work inside a Mongo transaction when the deployment
// supports it (replica set / mongos). On a standalone mongod — which
// rejects transactions — it transparently falls back to running the
// same work without a session.
//
// The callback ALWAYS receives a `session` value typed as
// `ClientSession | undefined`. Pass it through to every write
// (`{ session }`); when undefined, Mongoose simply ignores it.

import mongoose, { ClientSession } from 'mongoose';

export type TxnWork<T> = (session: ClientSession | undefined) => Promise<T>;

// Cache the capability check so we don't probe on every call.
let transactionsSupported: boolean | null = null;

function isUnsupportedTxnError(err: unknown): boolean {
    const e = err as { code?: number; codeName?: string; message?: string };
    // 20  = IllegalOperation (standalone), 263 = OperationNotSupportedInTransaction
    if (e?.code === 20 || e?.code === 263) return true;
    const msg = (e?.message || '').toLowerCase();
    return (
        msg.includes('transaction numbers') ||
        msg.includes('replica set') ||
        msg.includes('transactions are not supported') ||
        msg.includes('this mongod instance does not support transactions')
    );
}

/**
 * Execute `work` transactionally when possible, otherwise non-transactionally.
 * Never hard-requires a replica set.
 *
 * @returns `{ result, transactional }` — `transactional` reflects how it ran.
 */
export async function withTransaction<T>(work: TxnWork<T>): Promise<{ result: T; transactional: boolean }> {
    // Known-unsupported: skip straight to fallback.
    if (transactionsSupported === false) {
        const result = await work(undefined);
        return { result, transactional: false };
    }

    let session: ClientSession | undefined;
    try {
        session = await mongoose.startSession();
    } catch {
        transactionsSupported = false;
        const result = await work(undefined);
        return { result, transactional: false };
    }

    try {
        let result!: T;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        transactionsSupported = true;
        return { result, transactional: true };
    } catch (err) {
        if (isUnsupportedTxnError(err)) {
            transactionsSupported = false;
            // Fall back: re-run the work without a session.
            const result = await work(undefined);
            return { result, transactional: false };
        }
        // A genuine business/db error — propagate.
        throw err;
    } finally {
        await session.endSession().catch(() => undefined);
    }
}
