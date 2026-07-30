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

/** Resolve stale in-progress attempts (crashed process) to explicit `unknown`. */
export async function resolveStaleAttempts(orderId: IOrder['_id']): Promise<void> {
    const staleBefore = new Date(Date.now() - ATTEMPT_STALE_MS);
    const stale = await NotificationAttempt.findOneAndUpdate(
        { order: orderId, status: 'in_progress', startedAt: { $lt: staleBefore } },
        { $set: { status: 'unknown', finishedAt: new Date() } },
        { new: true },
    );
    if (stale) {
        // Release the order lease only if it still belongs to the stale attempt.
        await Order.updateOne(
            { _id: orderId, activeNotificationAttempt: stale.attemptId },
            { $unset: { activeNotificationAttempt: 1 } },
        );
    }
}

export type RetryRefusal =
    | { code: 'NOT_NOTIFIABLE'; httpStatus: 409 }
    | { code: 'NOTHING_TO_RETRY'; httpStatus: 409 }
    | { code: 'UNKNOWN_DELIVERY_CONFIRM_REQUIRED'; httpStatus: 409 }
    | { code: 'RETRY_IN_PROGRESS'; httpStatus: 429 }
    | { code: 'STATE_CHANGED'; httpStatus: 409 };

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

    await resolveStaleAttempts(order._id);

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

    // ━━━ Atomic claim: exact status + the seq the eligibility was read at. ━━━
    const attemptId = randomUUID();
    const seqRead = order.notificationSeq ?? null;
    const claimed = await Order.findOneAndUpdate(
        {
            _id: order._id,
            status: order.status,
            notificationSeq: seqRead,
            $or: [
                { activeNotificationAttempt: { $exists: false } },
                { activeNotificationAttempt: null },
            ],
        },
        { $set: { activeNotificationAttempt: attemptId } },
        { new: true },
    );
    if (!claimed) return { ok: false, refusal: { code: 'STATE_CHANGED', httpStatus: 409 } };

    const releaseLease = () =>
        Order.updateOne(
            { _id: order._id, activeNotificationAttempt: attemptId },
            { $unset: { activeNotificationAttempt: 1 } },
        ).catch(() => undefined);

    // ━━━ Durable attempt BEFORE any provider call. ━━━
    try {
        await NotificationAttempt.create({
            order: order._id,
            forStatus: claimed.status,
            attemptId,
            channels: retryable,
            status: 'in_progress',
            actorId: options.actorId,
            startedAt: new Date(),
        });
    } catch (err) {
        await releaseLease();
        if ((err as { code?: number }).code === 11000) {
            return { ok: false, refusal: { code: 'RETRY_IN_PROGRESS', httpStatus: 429 } };
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

    // ━━━ Finalize: attempt doc first (keyed by OUR attemptId), then the
    // order lease/seq/timeline (guarded by OUR attemptId — a stale process
    // can never finalize a newer attempt). ━━━
    await NotificationAttempt.updateOne(
        { attemptId, status: 'in_progress' },
        { $set: { status: 'completed', results: attemptResults, finishedAt: new Date() } },
    );
    await Order.updateOne(
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
    );

    const sent = retryable.filter((c) => results[c] === 'sent').length;
    const outcome: RetryOutcome['outcome'] = sent === retryable.length
        ? 'success'
        : sent > 0 ? 'partial' : 'failed';
    return { ok: true, result: { attempted: retryable, results, outcome } };
}
