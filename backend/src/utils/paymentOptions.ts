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

/**
 * The school-demo placeholder screens must never be treated as a real card
 * provider. Any URL whose path contains a demo payment route is rejected on
 * save and treated as UNCONFIGURED everywhere else, so production fails
 * closed instead of emailing customers a link to a demo page.
 */
export function isDemoPaymentUrl(value: unknown): boolean {
    const raw = String(value ?? '').trim();
    if (!raw) return false;
    try {
        const parsed = new URL(raw);
        return /(^|\/)(payment-demo)(\/|$)/.test(parsed.pathname)
            || /^\/(he|en|ru)\/orders\/[^/]+\/pay\/?$/.test(parsed.pathname);
    } catch {
        return /payment-demo/.test(raw);
    }
}

/**
 * Whether a VERIFIED card provider integration exists. A static HTTPS link
 * is NOT one — it gives no payment confirmation, no amount validation and
 * no webhook. This constant flips to a real capability check only when a
 * concrete provider adapter (services/payments) is implemented and
 * configured with owner-supplied credentials.
 */
export const VERIFIED_CARD_PROVIDER_INTEGRATED = false;

/** True when the admin saved a syntactically usable non-demo HTTPS link.
 *  Display-level only — it does NOT make the card method offerable. */
export function hasUsableCardLink(paymentOptions: PaymentOptions): boolean {
    const card = paymentOptions?.creditCard;
    if (!card?.enabled) return false;
    const url = String(card.paymentUrl || '').trim();
    return url.startsWith('https://') && !isDemoPaymentUrl(url);
}

/** True only when card payment is genuinely usable end-to-end: a verified
 *  provider integration AND a valid configuration. Currently always false —
 *  no provider is integrated. */
export function isCardPaymentConfigured(paymentOptions: PaymentOptions): boolean {
    return VERIFIED_CARD_PROVIDER_INTEGRATED && hasUsableCardLink(paymentOptions);
}

/**
 * Methods a customer may currently select. Credit card is offered ONLY
 * once a verified provider integration exists — an arbitrary static link
 * is not a production payment method.
 */
export function enabledPaymentMethods(paymentOptions: PaymentOptions): PaymentPreference[] {
    const enabled: PaymentPreference[] = [];
    if (paymentOptions?.bankTransfer?.enabled) enabled.push('bank_transfer');
    if (isCardPaymentConfigured(paymentOptions)) enabled.push('credit_card');
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
            || !String(bank.iban || '').trim()
        ) {
            return 'Bank transfer details are incomplete in Settings';
        }
        return null;
    }
    const card = paymentOptions?.creditCard;
    if (!card?.enabled) return 'Credit-card payment is disabled in Settings';
    const url = String(card.paymentUrl || '').trim();
    if (!url.startsWith('https://')) return 'Credit-card payment URL is missing or not HTTPS';
    if (isDemoPaymentUrl(url)) {
        return 'Credit-card payment URL points to the demo payment page — configure a real provider URL in Settings';
    }
    if (!VERIFIED_CARD_PROVIDER_INTEGRATED) {
        return 'No verified card payment provider is integrated — credit-card orders cannot be approved. '
            + 'Ask the customer to switch to bank transfer, or integrate a real provider first.';
    }
    return null;
}
