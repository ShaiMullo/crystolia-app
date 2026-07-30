// ===============================================
// 📨 Order notification retry — per-channel, crash-honest
// ===============================================
// Design (see PR #80 review):
//  * Per-channel: only channels whose LATEST recorded delivery for the
//    order's CURRENT status is failed/skipped (or unknown, with explicit
//    admin confirmation) are retried. A channel recorded as sent is never
//    resent.
//  * Durable attempt: a NotificationAttempt document is persisted BEFORE
//    any provider call. A crash mid-send leaves it in_progress; after a
//    TTL it resolves to an explicit `unknown` state that blocks automatic
//    resending until an admin confirms possible duplication.
//  * Atomic claim: the order-level lease (activeNotificationAttempt) is
//    taken with a CAS that binds the EXACT current status and the
//    notificationSeq the eligibility was computed from — a concurrent
//    status change or completed retry invalidates the claim. Finalization
//    is guarded by the attemptId, so a stale process can never finalize a
//    newer attempt.
//  * NOT idempotent end-to-end: the email/SMS providers used here expose
//    no documented idempotency key for sends, so a crash inside the
//    provider call can deliver without a record. That exact gap is what
//    the `unknown` state + explicit confirmation exists for.

import { randomUUID } from 'crypto';
import Order, { type IOrder } from '../models/Order.js';
import NotificationAttempt from '../models/NotificationAttempt.js';
import {
    isCustomerNotifiableStatus,
    sendCustomerOrderNotification,
    type CustomerNotificationChannel,
} from './orderNotificationService.js';
import { unlockedOrderFilter, notificationLeaseFreeFilter } from './orderLocks.js';
import { runRequiredTransaction, TransactionsUnavailableError } from '../db/withTransaction.js';

const ATTEMPT_STALE_MS = 10 * 60 * 1000;

export type ChannelState = 'sent' | 'failed' | 'skipped' | 'unknown' | 'none';

/** Sanitized category — raw provider/recipient errors never leave the server. */
export function categorizeSendError(error?: string): string {
    if (!error) return 'unknown_error';
    if (error === 'Configuration missing') return 'configuration_missing';
    if (/email missing|phone missing/i.test(error)) return 'recipient_missing';
    if (/timeout|timed out|abort/i.test(error)) return 'timeout';
    return 'provider_error';
}

/**
 * Latest per-channel delivery state for the order's CURRENT status:
 * completed/unknown NotificationAttempt documents take precedence (newest
 * first), then legacy timeline entries; channels that appear in neither
 * are 'none'.
 */
export async function deriveChannelStates(order: IOrder): Promise<{ email: ChannelState; sms: ChannelState }> {
    const state: { email: ChannelState; sms: ChannelState } = { email: 'none', sms: 'none' };

    // Newest first: the first value seen per channel wins.
    const attempts = await NotificationAttempt.find({
        order: order._id,
        forStatus: order.status,
        status: { $in: ['completed', 'unknown'] },
    }).sort({ startedAt: -1 }).lean();

    const applyChannel = (channel: 'email' | 'sms', value: ChannelState) => {
        if (state[channel] === 'none') state[channel] = value;
    };
    for (const attempt of attempts) {
        for (const channel of ['email', 'sms'] as const) {
            if (!attempt.channels.includes(channel)) continue;
            if (attempt.status === 'unknown') applyChannel(channel, 'unknown');
            else applyChannel(channel, attempt.results?.[channel]?.outcome ?? 'unknown');
        }
    }

    for (let i = order.timeline.length - 1; i >= 0; i -= 1) {
        const event = order.timeline[i];
        if (event.type !== 'customer_order_notification') continue;
        const meta = event.meta as { status?: string; email?: string; sms?: string } | undefined;
        if (meta?.status !== order.status) continue;
        for (const channel of ['email', 'sms'] as const) {
            const value = meta?.[channel];
            if (value === 'sent' || value === 'failed' || value === 'skipped' || value === 'unknown') {
                applyChannel(channel, value);
            }
        }
        if (state.email !== 'none' && state.sms !== 'none') break;
    }
    return state;
}

/**
 * Reconcile the order's notification lease with reality. Repeatable and
 * safe after any partial failure — every write is GUARDED by the exact
 * attemptId it targets, so a stolen/newer lease is never cleared, and each
 * intermediate state (crash between any two steps) is repaired by simply
 * running this again. Deliberately plain guarded writes rather than a
 * transaction: a recovery path must not itself fail on transaction
 * availability, and no intermediate state here is unsafe — the lease only
 * ever blocks work, never corrupts it.
 *
 * Invariant on return: Order.activeNotificationAttempt is either absent or
 * points to a FRESH in-progress NotificationAttempt. Specifically:
 *  - stale in_progress attempt        → marked unknown, its lease cleared;
 *  - lease → unknown/completed attempt → lease cleared;
 *  - lease → NO attempt document       → orphan lease cleared;
 *  - lease → fresh in-progress attempt → left untouched.
 */
export async function reconcileNotificationLease(orderId: IOrder['_id']): Promise<void> {
    const staleBefore = new Date(Date.now() - ATTEMPT_STALE_MS);

    // 1) A crashed mid-send attempt: in_progress past the TTL → explicit
    //    unknown, then release ITS lease (guarded — never someone else's).
    const stale = await NotificationAttempt.findOneAndUpdate(
        { order: orderId, status: 'in_progress', startedAt: { $lt: staleBefore } },
        { $set: { status: 'unknown', finishedAt: new Date() } },
        { new: true },
    );
    if (stale) {
        await Order.updateOne(
            { _id: orderId, activeNotificationAttempt: stale.attemptId },
            { $unset: { activeNotificationAttempt: 1 } },
        );
    }

    // 2) A lease that no longer points at live work: its attempt is
    //    unknown (e.g. crash between "mark unknown" and "release lease"),
    //    completed, or missing entirely. Clear it — guarded by the exact
    //    value read, so a newer lease claimed in between is never touched.
    const order = await Order.findById(orderId).select('activeNotificationAttempt').lean();
    const lease = order?.activeNotificationAttempt;
    if (!lease) return;
    const attempt = await NotificationAttempt.findOne({ attemptId: lease }).select('status').lean();
    if (attempt?.status === 'in_progress') return; // fresh live work — keep the lock
    await Order.updateOne(
        { _id: orderId, activeNotificationAttempt: lease },
        { $unset: { activeNotificationAttempt: 1 } },
    );
}

export type RetryRefusal =
    | { code: 'NOT_NOTIFIABLE'; httpStatus: 409 }
    | { code: 'NOTHING_TO_RETRY'; httpStatus: 409 }
    | { code: 'UNKNOWN_DELIVERY_CONFIRM_REQUIRED'; httpStatus: 409 }
    | { code: 'RETRY_IN_PROGRESS'; httpStatus: 429 }
    | { code: 'STATE_CHANGED'; httpStatus: 409 }
    | { code: 'FINALIZATION_CONFLICT'; httpStatus: 409 }
    | { code: 'TRANSACTIONS_UNAVAILABLE'; httpStatus: 503 };

class ClaimConflictError extends Error {
    constructor() { super('retry claim conflict'); this.name = 'ClaimConflictError'; }
}
class AttemptExistsError extends Error {
    constructor() { super('attempt already in progress'); this.name = 'AttemptExistsError'; }
}
class StaleFinalizationError extends Error {
    constructor() { super('finalization guard mismatch'); this.name = 'StaleFinalizationError'; }
}

export interface RetryOutcome {
    attempted: CustomerNotificationChannel[];
    results: Partial<Record<CustomerNotificationChannel, 'sent' | 'failed' | 'skipped'>>;
    outcome: 'success' | 'partial' | 'failed';
}

export async function retryOrderNotification(
    order: IOrder,
    options: { actorId?: string; confirmUnknown?: boolean },
): Promise<{ ok: true; result: RetryOutcome } | { ok: false; refusal: RetryRefusal }> {
    if (!isCustomerNotifiableStatus(order.status)) {
        return { ok: false, refusal: { code: 'NOT_NOTIFIABLE', httpStatus: 409 } };
    }

    await reconcileNotificationLease(order._id);

    // A FRESH in-progress attempt means another admin is mid-retry.
    const live = await NotificationAttempt.findOne({ order: order._id, status: 'in_progress' }).lean();
    if (live) return { ok: false, refusal: { code: 'RETRY_IN_PROGRESS', httpStatus: 429 } };

    const states = await deriveChannelStates(order);
    const retryable: CustomerNotificationChannel[] = [];
    let hasUnknown = false;
    for (const channel of ['email', 'sms'] as const) {
        if (states[channel] === 'failed' || states[channel] === 'skipped') retryable.push(channel);
        else if (states[channel] === 'unknown') {
            hasUnknown = true;
            if (options.confirmUnknown) retryable.push(channel);
        }
    }
    if (retryable.length === 0) {
        if (hasUnknown) return { ok: false, refusal: { code: 'UNKNOWN_DELIVERY_CONFIRM_REQUIRED', httpStatus: 409 } };
        return { ok: false, refusal: { code: 'NOTHING_TO_RETRY', httpStatus: 409 } };
    }

    // ━━━ Claim phase — ONE transaction: the order lease (bound to the
    // exact status, the seq the eligibility was read at, AND no live
    // status-transition lock) plus the durable in-progress attempt commit
    // together or not at all. A crash between them can no longer leave an
    // orphan lease without an attempt record. Provider calls stay OUTSIDE
    // the transaction.
    const attemptId = randomUUID();
    const seqRead = order.notificationSeq ?? null;
    let claimed: IOrder;
    try {
        claimed = await runRequiredTransaction(async (session) => {
            const claimedOrder = await Order.findOneAndUpdate(
                {
                    _id: order._id,
                    status: order.status,
                    notificationSeq: seqRead,
                    // Symmetric mutual exclusion: no live retry lease AND no
                    // live status-transition lock ($and keeps the two $or
                    // fragments from clobbering each other).
                    $and: [notificationLeaseFreeFilter(), unlockedOrderFilter()],
                },
                { $set: { activeNotificationAttempt: attemptId } },
                { new: true, session: session ?? null },
            );
            if (!claimedOrder) throw new ClaimConflictError();
            try {
                await NotificationAttempt.create(
                    [{
                        order: order._id,
                        forStatus: claimedOrder.status,
                        attemptId,
                        channels: retryable,
                        status: 'in_progress',
                        actorId: options.actorId,
                        startedAt: new Date(),
                    }],
                    { session },
                );
            } catch (err) {
                if ((err as { code?: number }).code === 11000) throw new AttemptExistsError();
                throw err;
            }
            return claimedOrder;
        });
    } catch (err) {
        if (err instanceof ClaimConflictError) {
            return { ok: false, refusal: { code: 'STATE_CHANGED', httpStatus: 409 } };
        }
        if (err instanceof AttemptExistsError) {
            return { ok: false, refusal: { code: 'RETRY_IN_PROGRESS', httpStatus: 429 } };
        }
        if (err instanceof TransactionsUnavailableError) {
            return { ok: false, refusal: { code: 'TRANSACTIONS_UNAVAILABLE', httpStatus: 503 } };
        }
        throw err;
    }

    // ━━━ Provider calls — only the retryable channels. ━━━
    const sendResults = await sendCustomerOrderNotification(
        claimed,
        claimed.status as Parameters<typeof sendCustomerOrderNotification>[1],
        retryable,
    ).catch(() => ({} as Awaited<ReturnType<typeof sendCustomerOrderNotification>>));

    const results: RetryOutcome['results'] = {};
    const attemptResults: Record<string, unknown> = {};
    for (const channel of retryable) {
        const raw = sendResults[channel];
        const outcome = !raw
            ? 'failed'
            : raw.success ? 'sent'
                : raw.error === 'Configuration missing' || /missing/i.test(raw.error ?? '') ? 'skipped'
                    : 'failed';
        results[channel] = outcome;
        attemptResults[channel] = {
            outcome,
            ...(outcome !== 'sent' ? { errorCategory: categorizeSendError(raw?.error) } : {}),
            ...((raw as { messageId?: string } | undefined)?.messageId
                ? { providerMessageId: (raw as { messageId?: string }).messageId }
                : {}),
        };
    }

    // ━━━ Finalize phase — ONE transaction: complete the EXACT attemptId
    // and update the order (timeline + seq + lease release) together. Both
    // guarded writes must match; otherwise the transaction aborts, the
    // attempt stays in_progress and is immediately marked `unknown` — a
    // recoverable state, never "completed attempt + inconsistent order". ━━━
    try {
        await runRequiredTransaction(async (session) => {
            const finalizedAttempt = await NotificationAttempt.findOneAndUpdate(
                { attemptId, status: 'in_progress' },
                { $set: { status: 'completed', results: attemptResults, finishedAt: new Date() } },
                { new: true, session: session ?? null },
            );
            const finalizedOrder = await Order.findOneAndUpdate(
                { _id: order._id, activeNotificationAttempt: attemptId },
                {
                    $unset: { activeNotificationAttempt: 1 },
                    $inc: { notificationSeq: 1 },
                    $push: {
                        timeline: {
                            type: 'customer_order_notification',
                            at: new Date(),
                            actorId: options.actorId,
                            meta: { status: claimed.status, retry: true, attemptId, ...results },
                        },
                    },
                },
                { new: true, session: session ?? null },
            );
            if (!finalizedAttempt || !finalizedOrder) throw new StaleFinalizationError();
        });
    } catch (err) {
        // The provider calls DID run — the outcome exists but could not be
        // recorded consistently. Mark our attempt `unknown` (guarded by
        // attemptId) so the next retry demands explicit confirmation, and
        // then release the order lease IF it is still ours — otherwise the
        // unknown attempt would hold the lease forever (stale resolution
        // only targets in_progress). Ordered unknown-first: a crash between
        // the two writes leaves "lease → unknown attempt", which
        // reconcileNotificationLease repairs on the next touch. A stolen /
        // newer lease never matches the guard and is never cleared.
        await NotificationAttempt.updateOne(
            { attemptId, status: 'in_progress' },
            { $set: { status: 'unknown', finishedAt: new Date() } },
        ).catch(() => undefined);
        await Order.updateOne(
            { _id: order._id, activeNotificationAttempt: attemptId },
            { $unset: { activeNotificationAttempt: 1 } },
        ).catch(() => undefined);
        if (err instanceof StaleFinalizationError || err instanceof TransactionsUnavailableError) {
            return {
                ok: false,
                refusal: err instanceof TransactionsUnavailableError
                    ? { code: 'TRANSACTIONS_UNAVAILABLE', httpStatus: 503 }
                    : { code: 'FINALIZATION_CONFLICT', httpStatus: 409 },
            };
        }
        throw err;
    }

    const sent = retryable.filter((c) => results[c] === 'sent').length;
    const outcome: RetryOutcome['outcome'] = sent === retryable.length
        ? 'success'
        : sent > 0 ? 'partial' : 'failed';
    return { ok: true, result: { attempted: retryable, results, outcome } };
}
