// ===============================================
// 💳 Payment configuration status
// ===============================================
// Single source for "is this payment method actually usable?" — consumed
// by the admin payment-status endpoint and aligned with
// utils/paymentOptions.ts (which gates checkout and order approval).

import type { ISettings } from '../../models/Settings.js';
import { isCardPaymentConfigured, hasUsableCardLink, isDemoPaymentUrl } from '../../utils/paymentOptions.js';
import type { PaymentMethodStatus } from './types.js';

type PaymentOptions = ISettings['paymentOptions'] | undefined | null;

/** Stable customer-facing transfer/payment reference for an order. */
export function orderPaymentReference(orderId: { toString(): string }): string {
    return `CRY-${orderId.toString().slice(-8).toUpperCase()}`;
}

export function getPaymentMethodsStatus(paymentOptions: PaymentOptions): {
    methods: PaymentMethodStatus[];
    anyConfigured: boolean;
} {
    const bank = paymentOptions?.bankTransfer;
    const bankIssues: string[] = [];
    if (bank?.enabled) {
        const missing = (['bankName', 'branch', 'accountNumber', 'accountName', 'iban'] as const)
            .filter((field) => !String(bank?.[field] || '').trim());
        if (missing.length > 0) bankIssues.push(`Missing bank fields: ${missing.join(', ')}`);
    }
    const bankStatus: PaymentMethodStatus = {
        method: 'bank_transfer',
        enabled: Boolean(bank?.enabled),
        configured: Boolean(bank?.enabled) && bankIssues.length === 0,
        provider: 'none',
        issues: bankIssues,
    };

    const card = paymentOptions?.creditCard;
    const cardIssues: string[] = [];
    const cardUrl = String(card?.paymentUrl || '').trim();
    if (card?.enabled) {
        if (!cardUrl) cardIssues.push('Payment URL is missing');
        else if (!cardUrl.startsWith('https://')) cardIssues.push('Payment URL is not HTTPS');
        else if (isDemoPaymentUrl(cardUrl)) {
            cardIssues.push('Payment URL points to the demo payment page — it can never be a card provider');
        }
        cardIssues.push(
            'No verified card provider is integrated. A static external link gives no payment '
            + 'confirmation, so the card method is NOT offered to customers and card-order approval '
            + 'is blocked until a real provider adapter is configured '
            + '(see docs/payments/PROVIDER_INTEGRATION_CHECKLIST.md)',
        );
    }
    // configured means "genuinely usable end-to-end" — with no verified
    // provider integration this is always false, even when a syntactically
    // valid static link was saved (reported separately for transparency).
    const cardStatus: PaymentMethodStatus = {
        method: 'credit_card',
        enabled: Boolean(card?.enabled),
        configured: isCardPaymentConfigured(paymentOptions),
        provider: 'none',
        staticLinkUsable: hasUsableCardLink(paymentOptions),
        issues: cardIssues,
    };

    return {
        methods: [bankStatus, cardStatus],
        anyConfigured: bankStatus.configured || cardStatus.configured,
    };
}
