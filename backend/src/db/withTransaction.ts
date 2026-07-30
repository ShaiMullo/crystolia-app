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
 * Thrown by runRequiredTransaction when the deployment cannot provide
 * transactions (standalone mongod). Callers translate this into an
 * explicit operational error (HTTP 503) — NEVER into a best-effort
 * fallback, because the caller chose this API precisely because partial
 * application would corrupt data.
 */
export class TransactionsUnavailableError extends Error {
    constructor() {
        super(
            'MongoDB transactions are unavailable (standalone deployment). '
            + 'Stock-safe order processing requires a replica set — see docs/deployment/mongo.md.',
        );
        this.name = 'TransactionsUnavailableError';
    }
}

/**
 * Execute `work` inside a Mongo transaction, or not at all. Unlike
 * withTransaction there is NO non-transactional fallback: unsupported
 * deployments get TransactionsUnavailableError before any write applies
 * (the standalone error surfaces on the transaction's first operation,
 * which then aborts cleanly).
 */
export async function runRequiredTransaction<T>(work: TxnWork<T>): Promise<T> {
    if (transactionsSupported === false) {
        throw new TransactionsUnavailableError();
    }
    let session: ClientSession;
    try {
        session = await mongoose.startSession();
    } catch {
        transactionsSupported = false;
        throw new TransactionsUnavailableError();
    }
    try {
        let result!: T;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        transactionsSupported = true;
        return result;
    } catch (err) {
        if (isUnsupportedTxnError(err)) {
            transactionsSupported = false;
            throw new TransactionsUnavailableError();
        }
        throw err;
    } finally {
        await session.endSession().catch(() => undefined);
    }
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
