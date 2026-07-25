// ===============================================
// 💳 Payment-option helpers (demo payment flow)
// ===============================================
// Single place that decides which payment methods a customer may choose and
// whether an order's selected method is still usable at approval time. Used
// by order placement, both admin order-status routes, and the approval
// notifications so the four can never disagree.

import type { ISettings } from '../models/Settings.js';

export const PAYMENT_PREFERENCES = ['bank_transfer', 'credit_card'] as const;
export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number];

export function isPaymentPreference(value: unknown): value is PaymentPreference {
    return typeof value === 'string' && (PAYMENT_PREFERENCES as readonly string[]).includes(value);
}

type PaymentOptions = ISettings['paymentOptions'] | undefined | null;

/** Methods a customer may currently select (admin-enabled ones only). */
export function enabledPaymentMethods(paymentOptions: PaymentOptions): PaymentPreference[] {
    const enabled: PaymentPreference[] = [];
    if (paymentOptions?.bankTransfer?.enabled) enabled.push('bank_transfer');
    if (paymentOptions?.creditCard?.enabled) enabled.push('credit_card');
    return enabled;
}

/**
 * Why an order with this preference cannot be approved right now, or null
 * when the configuration is usable. Approval must never go out with empty or
 * invalid payment instructions — if the admin disabled (or broke) the method
 * after the order was placed, the order stays unapproved until settings are
 * fixed. Orders without a preference (legacy) are always approvable.
 */
export function paymentConfigError(
    preference: PaymentPreference | undefined | null,
    paymentOptions: PaymentOptions,
): string | null {
    if (!preference) return null;
    if (preference === 'bank_transfer') {
        const bank = paymentOptions?.bankTransfer;
        if (!bank?.enabled) return 'Bank transfer is disabled in Settings';
        if (
            !String(bank.bankName || '').trim()
            || !String(bank.branch || '').trim()
            || !String(bank.accountNumber || '').trim()
            || !String(bank.accountName || '').trim()
        ) {
            return 'Bank transfer details are incomplete in Settings';
        }
        return null;
    }
    const card = paymentOptions?.creditCard;
    if (!card?.enabled) return 'Credit-card payment is disabled in Settings';
    const url = String(card.paymentUrl || '').trim();
    if (!url.startsWith('https://')) return 'Credit-card payment URL is missing or not HTTPS';
    return null;
}
