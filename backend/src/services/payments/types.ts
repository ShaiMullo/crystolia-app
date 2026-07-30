// ===============================================
// 💳 Payment provider abstraction — types
// ===============================================
// Provider-neutral foundation. Crystolia currently has NO real card
// provider: the only "card" mechanism is an admin-configured external
// HTTPS link ('external_link'), which is a payment *pointer*, not a
// verified integration. A real provider (Tranzila/Cardcom/Stripe/...)
// plugs in by implementing PaymentProviderAdapter — see
// docs/payments/PROVIDER_INTEGRATION_CHECKLIST.md. Nothing here may ever
// simulate a successful payment.

import type { Request } from 'express';
import type mongoose from 'mongoose';

/**
 * 'none'          — no card provider configured (fail closed).
 * 'external_link' — legacy static admin-configured URL; NOT a verified
 *                   integration: no session, no callback, no confirmation.
 * Real providers get their own explicit type when they are integrated.
 */
export type PaymentProviderType = 'none' | 'external_link';

export type PaymentMethodKey = 'bank_transfer' | 'credit_card';

/** Lifecycle a real provider integration must map its events onto. */
export type PaymentSessionStatus =
    | 'created'      // session/reference issued, customer not redirected yet
    | 'pending'      // customer at provider, outcome unknown
    | 'succeeded'    // provider confirmed via SIGNED webhook/API — never client redirect alone
    | 'failed'
    | 'cancelled'
    | 'expired';

export interface PaymentSessionRequest {
    orderId: mongoose.Types.ObjectId | string;
    companyId: mongoose.Types.ObjectId | string;
    /** Server-computed order total — providers must never trust client amounts. */
    amount: number;
    currency: string;
    /** Stable per-order reference; reused on retries (idempotency key). */
    paymentReference: string;
}

export interface PaymentSessionResult {
    provider: PaymentProviderType | string;
    sessionId: string;
    redirectUrl?: string;
    status: PaymentSessionStatus;
}

export interface WebhookVerificationResult {
    valid: boolean;
    /** Provider event id, used for webhook idempotency (process-once). */
    eventId?: string;
    reason?: string;
}

/**
 * Contract every real provider must fulfil. Card data never touches
 * Crystolia servers — providers must be redirect/hosted-fields based.
 * Verified payment events are posted into the existing transaction-safe
 * ledger (services/paymentService.ts postPayment), which is the single
 * source of payment truth.
 */
export interface PaymentProviderAdapter {
    readonly type: PaymentProviderType | string;
    /** Static config check — missing credentials means the method is NOT offered. */
    isConfigured(): boolean;
    createSession(input: PaymentSessionRequest): Promise<PaymentSessionResult>;
    /** MUST verify a cryptographic signature; returning valid=true without one is forbidden. */
    verifyWebhook(req: Request): Promise<WebhookVerificationResult>;
}

export interface PaymentMethodStatus {
    method: PaymentMethodKey;
    enabled: boolean;
    /** True only when the method is genuinely usable end-to-end. A saved
     *  static card link is NOT "configured" — no verified provider means
     *  no confirmation, so configured stays false. */
    configured: boolean;
    provider: PaymentProviderType;
    /** Card only: a syntactically valid non-demo HTTPS link is saved.
     *  Transparency for the admin — does not make the method offerable. */
    staticLinkUsable?: boolean;
    issues: string[];
}
