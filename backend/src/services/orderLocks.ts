// ===============================================
// 🔒 Order lock query fragments
// ===============================================
// Shared by the status-transition workflow (orderStatusService) and the
// notification-retry workflow (orderNotificationRetryService) so the two
// exclude each other SYMMETRICALLY: each claim requires the other lock to
// be absent. Compose these into a claim filter with $and — never by
// merging their $or clauses into one object, which would clobber them.

// A crashed process must not leave an order permanently locked.
export const ORDER_STATUS_LOCK_TTL_MS = 2 * 60 * 1000;

/** Matches orders with NO live status-transition lock (stale ones pass). */
export function unlockedOrderFilter(now = new Date()) {
    const staleBefore = new Date(now.getTime() - ORDER_STATUS_LOCK_TTL_MS);
    return {
        $or: [
            { statusLockAt: { $exists: false } },
            { statusLockAt: null },
            { statusLockAt: { $lt: staleBefore } },
        ],
    };
}

/** Matches orders with NO live notification-retry lease. Staleness is
 *  resolved via resolveStaleAttempts (the lease has no own timestamp — its
 *  age lives on the NotificationAttempt document). */
export function notificationLeaseFreeFilter() {
    return {
        $or: [
            { activeNotificationAttempt: { $exists: false } },
            { activeNotificationAttempt: null },
        ],
    };
}
