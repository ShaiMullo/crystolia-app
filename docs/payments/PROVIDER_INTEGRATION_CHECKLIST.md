# Payment Provider Integration Checklist

Crystolia has **no real card provider integrated**. The current "credit card" method is a static admin-configured HTTPS link (`external_link`) with **no payment confirmation** — the system never learns whether the customer paid. This checklist is the contract for integrating a real provider (Tranzila / Cardcom / Meshulam / PayPlus / Grow / Hyp / Pelecard / Stripe / …). The provider choice itself is a business decision and is **not** made in code.

## Architecture already in place

- `backend/src/services/payments/types.ts` — `PaymentProviderAdapter` interface every provider must implement (config check, session creation, webhook signature verification).
- `backend/src/services/payments/paymentStatusService.ts` — method/config health, consumed by `GET /api/settings/payment-status` (admin).
- `backend/src/routes/paymentWebhooks.ts` — `POST /api/payments/webhooks/:provider`, mounted **before** CSRF/JSON middleware (providers send no Origin; signatures need the raw body). Currently fail-closed: always 503.
- `backend/src/services/paymentService.ts` — the transaction-safe payment ledger (`postPayment`). **Single source of payment truth.** Verified provider events are posted here against the order's invoice.
- `utils/paymentOptions.ts` — gates which methods customers see and whether an order can be approved; demo URLs are treated as unconfigured.
- `orderPaymentReference(orderId)` — stable per-order reference for provider metadata / bank transfers.

## Integration steps

1. **Business decision (owner):** pick a provider; open a merchant account; obtain API credentials and a webhook signing secret.
2. **Secrets:** add credentials as environment variables on the server (`backend/.env.demo`) and to CI secrets if needed. Never in MongoDB, never in git. Extend `config/index.ts` with the new keys and add them to `logIntegrationConfigSummary`.
3. **Adapter:** implement `PaymentProviderAdapter` in `services/payments/providers/<name>.ts`:
   - `isConfigured()` — all credentials present; otherwise the card method must remain unoffered (fail closed).
   - `createSession()` — server-side only. Amount MUST come from the order's stored `totalAmount` (never from the client); include `orderPaymentReference` and order ownership metadata.
   - `verifyWebhook()` — cryptographic signature verification over the **raw body**. No signature → invalid. Also enforce timestamp tolerance if the provider supports it.
4. **Webhook handling** in `routes/paymentWebhooks.ts`:
   - Verify signature FIRST; reject otherwise (4xx, audit-logged).
   - Idempotency: persist the provider event id; a replayed event must be a no-op.
   - Map events to the session lifecycle (`PaymentSessionStatus`) and post `succeeded` events into the ledger via `postPayment` against the order's invoice.
   - Never mark anything paid from a client-side redirect/return URL alone.
5. **Order flow:** on approval of a card order, create the provider session and email the per-order URL (replaces the static link). Keep bank transfer untouched.
6. **Card data:** none touches Crystolia — redirect or provider-hosted fields only. Do not log PAN/CVV fragments; do not store provider tokens beyond what reconciliation needs.
7. **Admin UI:** surface provider status via `GET /api/settings/payment-status`; replace the static-URL field with provider configuration state.
8. **Tests:** signature verification (valid/invalid/replayed), amount tampering rejected, unconfigured provider = method not offered, webhook idempotency.
9. **Go-live:** sandbox first end-to-end (order → session → sandbox payment → webhook → invoice paid), then production credentials, then remove the `external_link` fallback and the demo pages (`DEMO_PAYMENT_PAGES_DISABLED=true`).

## Explicitly forbidden

- Simulating a successful payment in any environment that writes to the production database.
- Claiming a provider is connected while `isConfigured()` is false.
- Trusting client-supplied amounts, order ids without ownership checks, or unsigned webhooks.
