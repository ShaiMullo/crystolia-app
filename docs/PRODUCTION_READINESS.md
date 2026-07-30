# Production Readiness Audit — Crystolia

Date: 2026-07-30 · Baseline commit: `27df56a` (origin/main) · Status of backend suite at audit time: 124/124 tests green, typecheck clean.

Classification legend: **REMOVE** · **REPLACE** · **KEEP_FOR_DEVELOPMENT_ONLY** · **CONFIGURE** · **HARDEN** · **DEFER_WITH_REASON**.
"Needs" column: `user` = business decision, `creds` = external credentials, `prod-data` = a production data mutation (never performed automatically).

---

## 1. Demo-only code & placeholder data

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 1.1 | `payment-demo` page — honest demo screen ("no real charge"), **orphan route** (zero inbound links in code). Reachable only by direct URL. | KEEP_FOR_DEVELOPMENT_ONLY → gated | Medium | `frontend-client/app/[locale]/payment-demo/page.tsx` | Production Settings currently link to it as the "card payment URL" (see 1.3). Kept temporarily for backward compatibility, now `noindex` + disable switch (`DEMO_PAYMENT_PAGES_DISABLED=true`) for after the prod setting is replaced. | — |
| 1.2 | Orphaned `orders/[id]/pay` page — parallel dead payment surface with inline copy, bypasses i18n. | KEEP_FOR_DEVELOPMENT_ONLY → gated | Low | `frontend-client/app/[locale]/orders/[id]/pay/page.tsx` | Same gating as 1.1. | — |
| 1.3 | **Production Settings document (MongoDB) has `paymentOptions.creditCard` enabled with the demo URL** `https://business.crystolia.com/he/payment-demo` and dummy bank details. This is data, not code. | REPLACE (manual) | **Critical** | Prod `settings` collection | Customers choosing "credit card" get a link to a demo screen. Code now fails closed: a demo/invalid URL means the card method is not offered, approval of card orders is blocked with a clear reason, and saving a demo URL is rejected. **The data itself must be fixed manually — see "Manual production steps".** | user + prod-data |
| 1.4 | Seed/reset scripts (`seed.ts`, `seedDemo.ts`, `resetPasswords.ts`, boot-time `seedAdmin.ts`) | KEEP_FOR_DEVELOPMENT_ONLY | OK | `backend/src/scripts/*`, `backend/src/db/seedAdmin.ts` | All hard-guarded `NODE_ENV === 'development'`; demo reset only deletes `demo-seed`-tagged records. No change needed; never run against production. | — |
| 1.5 | Comax integration screen is an explicit local mock ("PREVIEW / MOCK", every action disabled, no network calls). | KEEP_FOR_DEVELOPMENT_ONLY | Low | `frontend-admin/lib/comaxMock.ts`, `frontend-admin/app/admin/system/integrations/comax/page.tsx` | Fabricates nothing and claims nothing is connected. Visible "coming soon" surface — acceptable; hide from nav when Comax work resumes. | user |
| 1.6 | `Settings.boxPrices` legacy catalog | KEEP (compatibility) | Low | `backend/src/models/Settings.ts`, `catalogService.ts` | Live fallback for legacy SKUs; Admin → Products is authoritative. Removal deferred until no order path resolves through it. | — |
| 1.7 | Unused client i18n keys `paymentSuccess`/`paymentFailed` (never rendered — no fake success path exists). | KEEP | Info | `frontend-client/app/components/dashboardTranslations.ts` | Confirmed not referenced; harmless. | — |

**Verified:** no code path anywhere simulates a successful payment; no secrets committed to git; the card flow is an admin-configured external HTTPS link with no overclaiming copy.

## 2. Payments (no real provider exists)

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 2.1 | No payment provider integration, no webhooks, no payment verification. Card = static emailed URL. Orders can complete with zero recorded payment. | REPLACE (foundation built now, provider later) | **Critical** | `emailService.ts`, `utils/paymentOptions.ts` | Provider-neutral foundation implemented: method-status service, demo-URL fail-closed guards, fail-closed webhook mount, admin payment-status endpoint, integration checklist (`docs/payments/PROVIDER_INTEGRATION_CHECKLIST.md`). Real provider requires a business decision + credentials — intentionally **not** chosen here. | user + creds |
| 2.2 | Card method offered to customers whenever `enabled=true`, even with missing/demo URL. | HARDEN (done) | High | `utils/paymentOptions.ts`, `CustomerDashboard.tsx` | Card is now offered only with a valid non-demo HTTPS URL (server + client). | — |
| 2.3 | Admin can save card provider without URL validation beyond https; demo URL accepted. | HARDEN (done) | High | `routes/settings.ts`, admin settings page | Demo URLs rejected on save with explicit error; admin sees the backend reason (was a generic toast). | — |
| 2.4 | Manual payment ledger (`Payment`/`Invoice`) is the only payment-truth store; transaction-safe. | KEEP | Info | `services/paymentService.ts` | This is the correct integration point for future provider webhooks (post verified events via `postPayment`). | — |

## 3. Orders & inventory

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 3.1 | No order-status state machine — any status reachable from any status; side-effects gated only on `previousStatus`. Re-approval double-reserves stock. | HARDEN (done) | High | `routes/orders.ts`, `routes/crmOrders.ts` | Explicit transition map + shared side-effect service; `inventoryReserved` flag makes reservation idempotent; leaving `approved` (not to `shipped`) releases the reservation. | — |
| 3.2 | Inventory `applyMovement` was read-modify-write → concurrent approvals could oversell. | HARDEN (done) | High | `services/inventoryService.ts` | Rewritten as conditional atomic `findOneAndUpdate` with availability guard in the filter. | — |
| 3.3 | Reservation failures silently swallowed — order approved + invoiced with no stock held. | DEFER_WITH_REASON (surfaced, not blocking) | Medium | `inventoryService.ts`, order routes | Production has **no Inventory rows yet**, so making reservation failures block approval would block *all* approvals. Now: failures are recorded on the order timeline and raised as admin notifications. Enforcement is a business decision after inventory data exists. | user + prod-data |
| 3.4 | No duplicate-submission protection on order creation. | HARDEN (done) | Medium | `routes/orders.ts`, `models/Order.ts`, client dashboard | Optional `clientRequestId` + partial unique index `(createdBy, clientRequestId)`; duplicate returns the existing order. Client sends a UUID per confirmation. | — |
| 3.5 | No rate limit on order creation. | HARDEN (done) | Medium | order routes | Per-user limiter (env-tunable `ORDER_RATE_LIMIT_MAX`). | — |
| 3.6 | Approval side-effects not transactional (status→stock→invoice→notify are separate awaits). | DEFER_WITH_REASON | Medium | order routes | Prod Mongo is standalone/Atlas-fallback mode; sessions unavailable everywhere. Mitigated by idempotent invoice + idempotent reservation + timeline records. Full transactionality needs a replica-set decision. | user |
| 3.7 | Admin CRM order creation trusts body-supplied line prices. | DEFER_WITH_REASON | Low | `crmOrders.ts` | Admin-only surface; intentional flexibility (custom pricing). Documented; revisit if agents get order-creation rights. | user |
| 3.8 | No email/SMS retry; failed approval emails never auto-resent. | DEFER_WITH_REASON | Medium | `orderNotificationService.ts` | Failures are recorded per-order in the timeline. A retry queue is real infrastructure (jobs/backoff/dedupe) — schedule as its own milestone. | — |

## 4. Auth & users

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 4.1 | VAT-based silent reclaim of an orphaned Company on approval (registrant inherits its order/invoice history). Admin sees only a generic duplicate flag. | DEFER_WITH_REASON | Medium | `services/registrationService.ts` | Behavior was deliberately built for re-registration continuity (PRs #74/#75). Changing the confirmation UX is a product decision; recommended: explicit "this approval reclaims company X with N orders" admin confirmation. | user |
| 4.2 | Soft-delete didn't invalidate live sessions (relied on `isActive` only). | HARDEN (done) | Low | `routes/users.ts` | `tokenVersion` bumped on soft-delete. | — |
| 4.3 | Failed logins not audited. | HARDEN (done) | Low | `routes/auth.ts` | Failed logins now write a `warning` audit event (no password material logged). | — |
| 4.4 | Per-IP-only reset throttle (email-bomb via IP rotation); in-memory limiter state (multiplies with replicas). | DEFER_WITH_REASON | Low | `middleware/rateLimiter.ts` | Single-instance deployment today; shared-store limiter (Redis) when scaling out. | — |
| 4.5 | `GET /api/settings` returns full settings (incl. bank details) to any authenticated user. | DEFER_WITH_REASON | Low | `routes/settings.ts` | All customers are admin-approved, and approved customers must see bank details to pay. Splitting a customer-safe projection is a follow-up. | — |
| 4.6 | JWT secret shared across services in on-disk `.env.demo` (not in git). | CONFIGURE | Medium | server `.env.demo` | Rotate the secret, restrict file permissions on the box. Manual op — see manual steps. | prod-data (env) |

## 5. Configuration & startup

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 5.1 | `MONGO_URI` silently defaults to `mongodb://localhost:27017/crystolia` **in production**. | HARDEN (done) | High | `backend/src/config/index.ts` | Production boot now fails fast when `MONGO_URI` is unset; missing provider creds are logged as one explicit startup summary. | — |
| 5.2 | `getEnvOrThrow` never throws (misnomer); provider creds default silently. | HARDEN (done) | Low | `config/index.ts` | Startup summary lists unconfigured integrations (email/SMS/Google/GreenInvoice) once, clearly. | — |
| 5.3 | Config that exists only in MongoDB: `Settings` (min order, boxPrices, payment options). | CONFIGURE | Info | `models/Settings.ts` | By design (admin-editable). Now validated harder on write + surfaced via payment-status endpoint. | — |

## 6. Observability & operations

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 6.1 | No error tracking/APM (no Sentry etc.); exceptions only in container stdout. | CONFIGURE | High | backend/frontends | Needs a provider decision (Sentry/self-hosted). Deferred to next milestone; structured logs exist today. | user + creds |
| 6.2 | Uptime monitor has no alerting (red runs only visible in Actions). | CONFIGURE | Medium | `.github/workflows/uptime-monitor.yml` | Wire a notification (email/Slack/Telegram) — needs a channel decision + secret. | user + creds |
| 6.3 | Request IDs generated internally; not accepted from or echoed to headers. | HARDEN (done) | Low | `middleware/requestLogger.ts` | Inbound `X-Request-Id` honored (sanitized), echoed on every response. | — |
| 6.4 | Backend service has no compose healthcheck; Caddy starts before backend ready. | HARDEN (done) | Medium | `docker-compose.demo.yml` | Healthcheck on `/api/live` + `depends_on: service_healthy`. | — |
| 6.5 | No HSTS/CSP at edge. | HARDEN (done: HSTS) | Medium | `deploy/demo/Caddyfile` | HSTS added per-host. CSP deferred: Next.js inline-script hashing needs its own pass. | — |
| 6.6 | Daily backups exist and are restore-tested in-pipeline (S3, SSE, 35-day retention), but `docs/deployment/mongo.md` claims backups are "metadata-only" (stale) and there is no human restore runbook. | HARDEN (done) | Medium | `docs/deployment/mongo.md`, new `docs/deployment/restore.md` | Stale doc corrected; restore runbook written from the actual workflow. | — |
| 6.7 | `production.yml` builds to ECR but deploys nothing; the live box is deployed only by manual `demo-deploy.yml` (instance literally named `crystolia-prod`); static AWS keys there vs OIDC elsewhere. | DEFER_WITH_REASON | Medium | `.github/workflows/*` | Deploy-model consolidation (retire EKS path or migrate to it) is an infrastructure decision. Migrating demo-deploy/backup to OIDC is recommended next. | user |
| 6.8 | frontend-client had no typecheck in CI; backend lint non-blocking. | HARDEN (done: client typecheck) | Low | `.github/workflows/ci.yml` | Client typecheck added. Backend lint left advisory — see "advisory lint debt". | — |
| 6.9 | Single box + standalone Mongo = SPOF, no transactions. | DEFER_WITH_REASON | Medium | infra | Cost/architecture decision (Atlas replica set / bigger topology). | user |

## 7. Admin & customer UX

| # | Finding | Class | Severity | Files | Impact / Fix | Needs |
|---|---------|-------|----------|-------|--------------|-------|
| 7.1 | Settings save shows only generic "save failed" — backend validation reasons swallowed. | HARDEN (done) | Medium | `frontend-admin/app/admin/settings/page.tsx` | Backend message surfaced via `getApiErrorMessage`. | — |
| 7.2 | Card can be enabled in admin UI without a URL (backend then 400s generically). | HARDEN (done) | Medium | admin settings page | Client-side guard + inline method-status display (configured / missing URL / demo URL blocked). | — |
| 7.3 | Six admin list pages show only a toast on load failure (error indistinguishable from empty). | DEFER_WITH_REASON | Low | products/orders/purchase-orders/suppliers/payments/inventory pages | Mechanical but broad UI change (OperationalError pattern exists in users/registrations); separate UI-focused PR recommended. | — |
| 7.4 | `window.confirm` for product delete / payment void; no confirm on approve/ship/complete transitions. | DEFER_WITH_REASON | Low | admin pages | UX consistency pass — bundle with 7.3. | — |
| 7.5 | Soft-delete presented as plain "Delete" in admin UI (no restore affordance/language). | DEFER_WITH_REASON | Low | users/products admin pages | Copy + restore-view product decision. | — |
| 7.6 | Client payment copy lives in 3 systems (dictionaries JSON has zero payment keys; dashboardTranslations.ts; inline COPY in demo pages). | DEFER_WITH_REASON | Low | frontend-client i18n | Consolidation is a refactor with regression risk across he/en/ru; separate PR. | — |

---

## Manual production steps (require the owner — never automated)

1. **Replace the demo card URL in production Settings** (Admin → Settings): either disable the credit-card method, or replace `paymentUrl` with a real provider URL once one exists. After this deploy, saving a `payment-demo` URL is rejected and the existing one is treated as *unconfigured* (card not offered; card-order approval blocked with a clear message).
2. **Enter real bank details** in Admin → Settings before relying on bank transfer (current values are placeholders).
3. After step 1, optionally set `DEMO_PAYMENT_PAGES_DISABLED=true` in the frontend-client environment to turn the demo pages into 404s.
4. **Rotate `JWT_SECRET`** on the server (`backend/.env.demo`), `chmod 600` the env files. Note: rotation logs out all sessions.
5. Decide: error-tracking provider (6.1), uptime alert channel (6.2), payment provider (2.1), replica-set Mongo (6.9).

## Pre-existing advisory lint debt

Backend `npm run lint` is non-blocking in CI by prior decision; existing warnings are untouched by this work and tracked separately from it. No lint rules or tests were weakened.
