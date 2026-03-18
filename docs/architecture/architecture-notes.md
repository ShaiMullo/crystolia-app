# Crystolia Architecture Notes

Maintenance guide for `command-center.html` and architecture decisions.

---

## What is `command-center.html`

A self-contained, single-file living architecture document for the Crystolia project.
Open it in any browser — no server, no build step required. No CDN, no npm, no build step.

- All notes and sprint fields persist to **browser `localStorage`** (not committed to git).
- Use **Ctrl+S** or the "שמור הכל" button to save locally.
- Use the PDF button to generate a printable snapshot.
- Current version: **v2.0** (added visual graph sections).

---

## Section Guide — All Sections

| Section | id | What it covers | Source of truth |
|---|---|---|---|
| System Architecture Graph | `sys-arch` | Visual flow: users → frontends → backend → MongoDB + deployment chain | Helm charts, Dockerfiles, ArgoCD apps |
| Business Domain Graph | `domain-graph` | Entity relationships grouped by CRM / Commerce / System domain | `backend/src/models/` |
| System Overview | `overview` | Text topology diagram — 3 surfaces + infra | Code + Helm |
| Founder Snapshot | _(inside overview)_ | Per-area health status + top risks | Team consensus |
| Module Control Table | `modules` | Per-module health, what works, gaps, priority | Code audit + QA |
| Frontend Map (client) | `frontend` | Routes, pages, auth method for frontend-client | `app/` directory |
| Frontend Map (admin) | _(inside frontend)_ | Routes, tabs, auth method for frontend-admin | `app/admin/` directory |
| Backend Route Map | `routes` | All API routes, HTTP methods, access levels | `backend/src/routes/` |
| Data Model Map | `datamodel` | All Mongoose models, key fields, relationships | `backend/src/models/` |
| Implemented Flows | `flows` | Verified end-to-end user journeys | Manual testing |
| Missing Flows | _(inside flows)_ | Gaps in user journeys | Code + product review |
| Infra / GitOps | `infra` | Cluster, networking, CD pipeline, modes | `crystolia-infra/`, `crystolia-gitops/` |
| Runtime Topology | `runtime-topology` | Visual runtime plane + control plane | ArgoCD apps, Terraform, GitHub Actions |
| Gaps Table | `gaps` | All known architectural gaps with severity | Ongoing audit |
| Priority Stack | `priority` | Ordered action list | Product + engineering |
| Tech Debt / Decisions | `techdebt` | Unresolved design decisions and code debt | Code review + runtime |
| Sprint Control | `sprint` | Current sprint focus and blockers | localStorage only |
| Live Notes | `notes` | Freeform working notes | localStorage only |

---

## How to Update the Document

### Maintenance Checklist

**When a new API route or service is added:**
- [ ] Update **Backend Route Map** (`#routes`) — add row with method badge, path, access, description
- [ ] Update **System Architecture Graph** (`#sys-arch`) — add new service node if it's a new surface

**When a domain model is added or changed:**
- [ ] Update **Data Model Map** (`#datamodel`) — update or add model box with new fields
- [ ] Update **Business Domain Graph** (`#domain-graph`) — add/update entity node and relationships

**When infra topology changes (new service, namespace, cluster):**
- [ ] Update **Runtime Topology** (`#runtime-topology`) — update runtime plane pods/namespaces
- [ ] Update **Infra / GitOps** (`#infra`) — update table rows for cluster/networking/GitOps

**When deployment flow changes (new workflow, new registry, new CD step):**
- [ ] Update **System Architecture Graph** (`#sys-arch`) — right panel deployment chain
- [ ] Update **Runtime Topology** (`#runtime-topology`) — control plane track

**When a new frontend page or tab is added:**
- [ ] Update **Frontend Map** (`#frontend`) — add row to the relevant table

**When a gap is resolved:**
- [ ] Remove from **Gaps Table** (`#gaps`)
- [ ] Update **Module Control Table** (`#modules`) — change status badge if applicable
- [ ] Update **Founder Snapshot** — update health status if area is now complete

**When a module status changes:**
- [ ] Update **Module Control Table** (`#modules`)
- [ ] Update **Founder Snapshot**

**When an architecture decision is made:**
- [ ] Resolve from Open Decisions list in **Tech Debt** section
- [ ] If the decision changes a diagram — update the relevant graph section

**When production environment is created:**
- [ ] Update **KPI block** — change "Staging" to "Staging + Prod"
- [ ] Update **Runtime Topology** — add prod runtime plane
- [ ] Update **System Architecture Graph** — add prod deployment path
- [ ] Update **Infra / GitOps** — add prod environment row

### Versioning

Bump `id="doc-version"` (and `id="doc-version-footer"`) at the top of the file:
- `v1.x` — content updates (new routes, gaps, status changes, text)
- `v2.x` — layout or section restructuring (new graph sections, major additions)

---

## Visual Graph Sections — Design Reference

### System Architecture Graph (`#sys-arch`)

**What it shows:** Two parallel user flows (customer and admin/agent) both funnel into a shared backend API + MongoDB. A separate column shows the full deployment chain from GitHub to ALB.

**CSS node classes:**
- `.gn-public` — green — customer-facing surfaces
- `.gn-internal` — blue — internal/admin surfaces
- `.gn-backend` — amber/yellow — backend service
- `.gn-store` — purple — data stores (MongoDB)
- `.gn-infra` — orange — infra/delivery (ArgoCD, EKS, ALB)
- `.gn-control` — gray — config/control plane (GitHub, Terraform, ECR)

**When to update:** Any time a new surface is added (new Next.js app), the backend splits, a new delivery step is added to the CI/CD chain, or the infrastructure topology changes.

**Source of truth:** `crystolia-gitops/apps/`, `crystolia-infra/terraform/`, GitHub Actions workflow files.

---

### Business Domain Graph (`#domain-graph`)

**What it shows:** Three dashed-border domain zones:
1. **CRM Domain** — Lead (pre-customer), manual convert path to User
2. **Commerce Domain** — User ↔ Company → Order → Invoice (optional link)
3. **System Domain** — Settings (singleton, drives ordering rules), AuditLog (cross-cutting)

**When to update:** Any time a new Mongoose model is added, a relationship between models changes, or a domain boundary shifts (e.g., if Lead conversion becomes automated).

**Source of truth:** `backend/src/models/` — all `.ts` model files.

**Known accuracy issues:** AuditLog coverage is marked as partial (orders/invoices/settings not yet fully logged).

---

### Runtime Topology (`#runtime-topology`)

**What it shows:**
- **Runtime Plane** — Internet → ACM/ALB → EKS pods (crystolia ns: frontend-client, frontend-admin, backend, mongodb; argocd ns: argocd-server, external-secrets-operator) → AWS Secrets Manager
- **Control Plane** — GitHub repos → two tracks: (1) GitHub Actions → ECR → ArgoCD sync, and (2) Terraform → Platform Mode Switch

**When to update:**
- New EKS namespace or pod added → update runtime plane pods section
- New CI/CD step added → update control plane track
- Production environment created → add second runtime plane panel
- MongoDB gets PVC → remove persistence warning note

**Source of truth:** `crystolia-gitops/apps/` (ArgoCD Application manifests), `crystolia-infra/terraform/`, `.github/workflows/`

---

## Current Architecture Gaps (Summary)

### Critical
- **No production environment** — staging only; cannot serve real customers safely.

### Medium
- ~~**No invoice PDF**~~ — **Resolved (2026-03-17).** `POST /api/invoices/:id/issue` calls Green Invoice API → stores `pdfUrl` + `greenInvoiceDocId` on Invoice, sets status=`issued`. Admin "Issue & PDF" button in invoices tab. **To activate:** fill `GREEN_INVOICE_API_ID` / `GREEN_INVOICE_SECRET` in Helm secrets, set `GREEN_INVOICE_SANDBOX=false`.
- ~~**No auto-invoice on order approval**~~ — **Resolved (2026-03-17).** `PATCH /api/orders/:id` auto-creates a draft Invoice when `status=approved`. Idempotent. See implementation note in roadmap section B.
- **No `/companies` API endpoint** — company creation is implicit via onboarding only.
- ~~**Incomplete audit log**~~ — **Resolved (2026-03-17).** Orders POST (CREATE) + PATCH (UPDATE), Invoices POST (CREATE) + PATCH (UPDATE) now write AuditLog entries. Settings PUT + Leads POST were already audited.
- **WhatsApp credentials not created** — ESO wired (2026-03-17). `crystolia-gitops/external-secrets/backend-whatsapp-secret.yaml` will create K8s secret `crystolia-whatsapp-secret` once AWS SM secret `crystolia/whatsapp` exists with properties `instanceId`, `token`, `adminPhone`. Backend uses `optional: true` so pods start without it.
- **Monitoring operational status unverified** — kube-prometheus-stack + Loki + Promtail confirmed deployed in `monitoring` ns; dashboard and alerting rule configuration not verified.

### Low
- **No pagination** on orders/invoices/leads list routes.
- **Lead.assignedTo stored as string** — no ObjectId ref, no referential integrity.

---

## Post-WhatsApp Implementation Roadmap (2026-03-17)

Recommended order after WhatsApp is activated. Each item is self-contained.

### ~~C — Full audit logging for orders/invoices~~ — **Implemented (2026-03-17)**

`orders.ts` and `invoices.ts` now import `logAudit` from `auditService.js` and write AuditLog entries on every create and update. Full audit coverage is now:

| Route | Action logged |
|---|---|
| `POST /api/leads` | CREATE Lead (pre-existing) |
| `PUT /api/settings` | UPDATE Settings (pre-existing) |
| `POST /api/orders` | CREATE Order — details: `{totalAmount, itemCount}` |
| `PATCH /api/orders/:id` | UPDATE Order — details: `{status}` |
| `POST /api/invoices` | CREATE Invoice — details: `{invoiceNumber, totalAmount, status}` |
| `PATCH /api/invoices/:id` | UPDATE Invoice — details: changed fields from `req.body` |

---

### ~~B — Auto-create invoice when order is approved~~ — **Implemented (2026-03-17)**

**Scope:** Backend only, ~1-2 hrs. Architecture decision: **yes, auto-create draft Invoice on `status=approved`**.

`PATCH /api/orders/:id` currently does `findByIdAndUpdate({status})` with no side effects. Add:
1. Detect `status === 'approved'`
2. Check `Invoice.findOne({ order: orderId })` — skip if already exists (idempotent)
3. Auto-generate `invoiceNumber` — format: `INV-{YYYY}-{timestamp-suffix}` (no sequential counter needed at this scale; use `Date.now()` last 6 digits)
4. `Invoice.create({ company: order.company, order: order._id, invoiceNumber, totalAmount: order.totalAmount, status: 'draft' })`
5. Log audit: `CREATE` on `Invoice`

**Required changes:**
- `backend/src/routes/orders.ts` — fetch full order before update (need `company` + `totalAmount`), add invoice auto-create block after successful status update
- No model changes (Invoice already has `order?: ObjectId`)

**Frontend:** No changes — the draft invoice appears in the invoices tab automatically on next fetch.

Risks: invoice number collision (extremely low with timestamp suffix at this scale); admin approving twice (idempotency check covers it).

---

### ~~A — Invoice PDF generation via Green Invoice~~ — **Implemented (2026-03-17)**

**Scope:** External service integration, ~2-4 hrs. Green Invoice is the intended provider — already wired in Helm (`GREEN_INVOICE_API_ID`, `GREEN_INVOICE_SECRET`, `GREEN_INVOICE_SANDBOX`). No backend code reads these yet.

**Required changes:**
- `backend/src/config/index.ts` — add `greenInvoice: { apiId, secret, sandbox }` section reading from env vars
- `backend/src/services/greenInvoiceService.ts` — new file: Green Invoice API client (auth → create document → get PDF URL)
- `backend/src/models/Invoice.ts` — add `pdfUrl?: string` and `greenInvoiceDocId?: string` optional fields
- `backend/src/routes/invoices.ts` — add `POST /api/invoices/:id/issue` route: call Green Invoice API, store `pdfUrl` + `greenInvoiceDocId` on invoice, change status to `issued`
- `frontend-admin/app/admin/page.tsx` — add "Issue & Download PDF" button on invoice row (calls POST `/:id/issue`, then opens `pdfUrl`)
- `frontend-admin/types/index.ts` — add `pdfUrl?: string; greenInvoiceDocId?: string` to `Invoice` type

**Infra:** GREEN_INVOICE env vars already in `backend-deployment.yaml` from `{{ .Release.Name }}-secrets`. Fill real credentials in `secrets.yaml` at deploy time (or add as ESO-managed secret like WhatsApp).

**Data model impact:** Invoice gets 2 optional fields — no migration needed (MongoDB schema-flexible).

Risks: Green Invoice API requires Israeli business registration details; sandbox mode must be tested first (`GREEN_INVOICE_SANDBOX: "true"`); PDF URL may be time-limited (need to cache or re-fetch).

---

## Open Architecture Decisions

1. ~~**Invoice auto-generation**~~ — **Resolved (2026-03-17): yes**, auto-create draft Invoice when Order status = `approved`. See roadmap section B above.
2. ~~**WhatsApp provider**~~ — **Resolved (2026-03-17): UltraMsg.** Helm aligned to code. Fill credentials in staging to activate.
3. **Payment gateway**: No decision made. Dead payment UI removed from frontend-client. Backend route never existed.
4. **Lead → Customer conversion**: Automated flow on Lead status = `won`, or manual register + link?

---

## Verified vs Assumed — Verification Pass (2026-03-16, completed)

### Confirmed from code

| Claim | Source |
|---|---|
| DNS fully automated via Terraform Route53 | `crystolia-infra/terraform/dns.tf` — `aws_route53_zone` + `aws_route53_record` for all subdomains |
| MongoDB has 8Gi PVC on `gp3-csi` | `crystolia-gitops/argocd/apps/crystolia-mongodb.yaml` — `persistence.enabled: true, storageClass: gp3-csi, size: 8Gi` |
| ESO runs in `external-secrets` namespace | `argocd/apps/external-secrets-app.yaml` — destination namespace confirmed |
| Monitoring in `monitoring` namespace — kube-prometheus-stack + Loki + Promtail | `monitoring-app.yaml` (destination.namespace: monitoring), `loki-app.yaml` (destination.namespace: monitoring), `promtail-app.yaml` (destination.namespace: monitoring) |
| Monitoring detail: kube-prometheus-stack v72.6.2 (Grafana + Prometheus + Alertmanager) | `argocd/apps/monitoring-app.yaml` — chart: kube-prometheus-stack |
| Loki: SingleBinary, 5Gi gp3-csi PVC, 72h retention | `argocd/apps/loki-app.yaml` — inline Helm values |
| Promtail ships to `loki.monitoring.svc.cluster.local:3100` | `argocd/apps/promtail-app.yaml` — config.clients url |
| Platform mode workflow is `sabbath-mode.yml` | `.github/workflows/sabbath-mode.yml` — cron triggers Friday 18:00 UTC / Saturday 23:00 UTC |
| CI build workflow confirmed — `staging.yml` in `crystolia-app` | `crystolia-app/.github/workflows/staging.yml` — push to main → path-filtered detect changes → build Docker → push ECR (OIDC) → update `staging/values.yaml` in gitops → ArgoCD auto-syncs |
| Production build workflow exists — `production.yml` | `crystolia-app/.github/workflows/production.yml` — triggered by `v*` tag push; builds all 3 images → ECR; no GitOps update step |
| 3 ECR repositories | `staging.yml` / `production.yml` — `crystolia-backend`, `crystolia-frontend`, `crystolia-frontend-admin` |
| AWS OIDC (no static credentials) | Both workflows use `aws-actions/configure-aws-credentials` with `role-to-assume` OIDC |
| WhatsApp: UltraMsg, ESO-managed (2026-03-17) | `config/index.ts` reads `ULTRAMSG_INSTANCE_ID`/`ULTRAMSG_TOKEN`/`ADMIN_PHONE_NUMBER` (optional); `backend-deployment.yaml` sources from `crystolia-whatsapp-secret` (optional); `external-secrets/backend-whatsapp-secret.yaml` creates that K8s secret from AWS SM `crystolia/whatsapp` |
| Backend `protect` reads `auth_token` cookie only | `backend/src/middleware/auth.ts` — reads `req.cookies.auth_token`, no Bearer fallback |
| ALL logins set `auth_token` HttpOnly cookie — all roles | `backend/src/routes/auth.ts` — `createSendToken()` used by `/register`, `/login`, Google OAuth callback; no branching by role |
| `createSendToken()` cookie: httpOnly, secure, sameSite lax, configurable domain | `auth.ts` lines 83-108 |
| frontend-client is cookie-only (2026-03-17) | `app/lib/api.ts` — `withCredentials: true` only; Bearer interceptor removed. `AuthContext.tsx` — no localStorage token; logout calls `POST /api/auth/logout`. `OnboardingPage.tsx` — raw fetch replaced with `api` instance. |
| CRM router is admin-only — `router.use(authorize('admin'))` | `backend/src/routes/crm.ts` line 17 — NOT admin+agent |
| No `/crm/leads/:id/whatsapp` route | `crm.ts` fully read (277 lines) — no such route |
| No `/crm/leads/:id/timeline` route | `crm.ts` fully read (277 lines) — no such route |
| No `DELETE /api/users/:id` route | `users.ts` fully read (150 lines) — routes: GET /me, GET /, POST /, PATCH /:id only |
| `PATCH /users/:id` updates: name, email, role, isActive, password | `users.ts` lines 112+ |
| Customer routes: `/my-profile`, `/complete-profile`, `/update-profile` | `backend/src/routes/customers.ts` |
| CRM routes all have `/leads/` path segment | `backend/src/routes/crm.ts` — `GET/PATCH /crm/leads/:id`, `POST /crm/leads/:id/notes`, etc. |
| No `GET /orders/:id` route exists | `backend/src/routes/orders.ts` — only `GET /orders`, `POST /orders`, `PATCH /orders/:id` |
| `GET /users/me` exists for all authenticated users | `backend/src/routes/users.ts` |
| Settings model has no WhatsApp fields | `backend/src/models/Settings.ts` — only `boxPrices`, `minimumOrderAmount`, `currency`, `updatedBy` |
| Order items: `productName`/`quantity`/`price` all required | `backend/src/models/Order.ts` — all three `required: true`; no `productType` field |
| Helm uses single chart `crystolia-chart` for all 3 services | `helm/crystolia-chart/` + `staging/values.yaml` |
| Image tags are SHA-pinned | `staging/values.yaml` — tag: `77275da179ffe5c473c05bbd272c8e1a8fd031dd` |
| Health check endpoints: `/api/health`, `/api/ready`, `/api/live` | `backend/src/index.ts` lines 94-118 |
| MongoDB auth disabled in Helm chart | `argocd/apps/crystolia-mongodb.yaml` — `auth: { enabled: false }` |
| Full audit log coverage — orders + invoices (2026-03-17) | `backend/src/routes/orders.ts` + `invoices.ts` — `logAudit` imported and called on POST (CREATE) and PATCH (UPDATE) in both files |
| Auto-create draft Invoice on order approval (2026-03-17) | `backend/src/routes/orders.ts` — `PATCH /:id` fetches order first (`findById`), updates via `order.save()`, then if `status==='approved'` checks `Invoice.findOne({order})` — creates draft if none exists. Failure isolated in inner try/catch. |
| Invoice PDF via Green Invoice (2026-03-17) | `backend/src/services/greenInvoiceService.ts` — auth + document create. `POST /api/invoices/:id/issue` — loads invoice + company, calls service, saves `pdfUrl`/`greenInvoiceDocId`/`status=issued`. Model extended with 2 optional fields. Admin UI: "Issue & PDF" button on draft rows. |
| `issuedAt` date bug in `POST /api/invoices/:id/issue` — fixed (2026-03-17) | **Bug:** `issuedAt: invoice.issuedAt` was passed to `issueInvoice()` before `invoice.issuedAt = new Date()` was assigned, so the PDF printed the invoice *creation* date, not the actual *issue* date. **Fix:** `const issueDate = new Date()` captured before the service call; both the service payload and the Mongoose assignment now use `issueDate`. PDF date and DB record share the same timestamp. |
| `JWT_SECRET` injected into frontend-admin pod — confirmed (2026-03-17) | `helm/crystolia-chart/templates/frontend-admin-deployment.yaml` lines 53–57 already inject `JWT_SECRET` via `secretKeyRef: {name: crystolia-backend-secret, key: JWT_SECRET}`. Flagged as missing in secrets inventory; confirmed already present. No fix needed. |
| `GOOGLE_CALLBACK_URL` added to staging values — fixed (2026-03-17) | Was never set in any Helm values file; backend always defaulted to `http://localhost:4000/api/auth/google/callback` in all deployed environments. Fixed: `GOOGLE_CALLBACK_URL: "https://staging.crystolia.com/api/auth/google/callback"` added to `crystolia-gitops/staging/values.yaml` backend env block. Remaining action: register this callback URL in Google Cloud Console. |
| `FRONTEND_URL` production value corrected — fixed (2026-03-17) | `production/values.yaml` had `FRONTEND_URL: "https://admin.crystolia.com"`. `config.frontendUrl` is used exclusively in Google OAuth redirects to customer routes (`/en/login`, `/en/dashboard`, `/en/onboarding`). These routes live on the customer portal (`crystolia.com`), not the admin frontend. Fixed: changed to `https://crystolia.com`. Also corrected `CORS_ALLOW_ORIGINS` to include both origins: `https://crystolia.com,https://admin.crystolia.com`. |
| ~~Dead Supabase `send-lead` routes + package removed — fully resolved (2026-03-17)~~ | Both `app/api/send-lead/route.ts` files deleted. `@supabase/supabase-js ^2.86.0` removed from both `frontend-client/package.json` and `frontend-admin/package.json` (10 packages removed from each). Verified: zero source imports remain. Remaining references are README env examples and `tsconfig.tsbuildinfo` build cache (non-code, auto-regenerated). |

### Secrets Inventory Mismatches (audit 2026-03-17)

Found during full secrets/credentials inventory. Status as of 2026-03-17:

| Issue | Status | Notes |
|---|---|---|
| ~~`JWT_SECRET` not injected into frontend-admin pod~~ | **Confirmed already present** — no fix needed | `frontend-admin-deployment.yaml` lines 53–57 already inject it via `secretKeyRef: crystolia-backend-secret` |
| ~~`GOOGLE_CALLBACK_URL` never set — always localhost~~ | **Fixed (2026-03-17)** | Added to `staging/values.yaml` backend env. Still requires: register `https://staging.crystolia.com/api/auth/google/callback` in Google Cloud Console |
| Grafana admin placeholder password committed to git | **Open** | `production/grafana-admin-secret.yaml` has `ChangeMeInProduction123!`. Fix before prod: replace with real value or rely on ESO (`grafana-admin-credentials` ExternalSecret already wired). Verify which K8s secret name Grafana Helm chart actually mounts |
| `ADMIN_FRONTEND_URL` never injected, always localhost | **Open / low priority** | Config reads it, no active route logic uses the value. Safe to ignore until a route needs it |
| Twilio + `PAYMENT_PROVIDER` wired in Helm and deployment, dead in code | **Open / low priority** | `secret.yaml` + `backend-deployment.yaml` inject these as env vars; zero backend code reads them. Not blocking anything — remove in a future cleanup pass |
| ~~`CORS_ALLOW_ORIGINS` staging: admin frontend excluded~~ | **Confirmed not an issue (2026-03-17)** | Both frontends use `baseURL: "/api"` relative path — Next.js proxies all browser calls. No direct browser-to-backend cross-origin requests. CORS change not needed for staging |
| ~~`FRONTEND_URL` in `production/values.yaml` set to `admin.crystolia.com`~~ | **Fixed (2026-03-17)** | Changed to `https://crystolia.com`. Also updated `CORS_ALLOW_ORIGINS` to include both `https://crystolia.com` and `https://admin.crystolia.com` |
| ~~Dead Supabase `send-lead` routes + package — fully removed (2026-03-17)~~ | **Resolved** | Route files deleted, `@supabase/supabase-js ^2.86.0` removed from both frontend `package.json` files. Zero source imports remain |
| `secrets.whatsapp` block in `production/values.yaml` uses wrong field names | **Open / low priority** | Uses `accessToken`, `phoneNumberId`, `webhookVerifyToken` (old WhatsApp Cloud API shape). `secret.yaml` template does NOT consume these fields (comment says WhatsApp is managed via ESO). These values are created in `values.yaml` but never templated into the secret. Dead config |

---

### Green Invoice Implementation Caveats (verification pass 2026-03-17)

The following are unverified assumptions in `greenInvoiceService.ts` that must be confirmed against the Green Invoice sandbox before enabling live invoicing:

| Assumption | Risk if wrong | How to verify |
|---|---|---|
| Endpoint: `POST /account/token` for auth, `POST /documents` for doc creation | 404 / auth failure | Check official Green Invoice API docs or Postman collection |
| Auth scheme: `Authorization: Bearer {token}` on `/documents` | 401 on all document requests | Sandbox test |
| Document type `320` = חשבונית מס (tax invoice) | Wrong document type issued | Confirm from Green Invoice type list |
| Response shape: `doc.id` or `doc.data?.id` for document ID; `doc.url` or `doc.data?.url` for PDF URL | `pdfUrl`/`greenInvoiceDocId` stored as `undefined` | Sandbox test + log `doc` raw response |
| `income[0].price = totalAmount` is **pre-VAT** | If `totalAmount` is VAT-inclusive, Green Invoice adds VAT again → inflated PDF total | Business logic decision — confirm with accountant before live invoicing |
| PDF URL is permanent (not time-limited) | Stored `pdfUrl` becomes 403/404 after expiry | Test link after 24h; may need to re-fetch or use download endpoint |

**Verdict (2026-03-17): safe with caveats** — structurally sound, one real bug fixed (`issuedAt` date), all API shapes are assumptions. Sandbox test required before going live.

### Remaining assumptions (not verified from code)

| Claim | Assumption | How to verify |
|---|---|---|
| `cheap` mode behaviour | Assumed reduced replicas | Read `scripts/switch-mode.sh` in crystolia-gitops |

---

## WhatsApp Activation Runbook (UltraMsg / Staging)

**Status (2026-03-17):** ESO fully wired. One manual step remaining: create the AWS Secrets Manager secret.

### Full chain (verified)

```
AWS SM: crystolia/whatsapp  { instanceId, token, adminPhone }
  ↓ ESO backend-whatsapp-secret.yaml (refreshInterval: 1h)
K8s Secret: crystolia-whatsapp-secret (ns: crystolia)
  ULTRAMSG_INSTANCE_ID / ULTRAMSG_TOKEN / ADMIN_PHONE_NUMBER
  ↓ backend-deployment.yaml (optional: true on all three)
Pod env vars
  ↓ backend/src/config/index.ts
config.whatsapp.instanceId / config.whatsapp.token / config.adminPhone
  ↓ backend/src/routes/leads.ts — POST /api/leads (only trigger)
sendTextMessage(config.adminPhone, message)
  ↓ backend/src/services/whatsappService.ts
POST api.ultramsg.com/{instanceId}/messages/chat { token, to: normalized, body }
```

### Activation step

```bash
aws secretsmanager create-secret \
  --name crystolia/whatsapp \
  --region us-east-1 \
  --secret-string '{
    "instanceId": "<your-ultramsg-instance-id>",
    "token": "<your-ultramsg-token>",
    "adminPhone": "972501234567"
  }'
```

- `adminPhone`: use full international format (`972...`) or local (`05...`) — `normalizePhoneNumber()` in whatsappService handles both.
- ESO syncs within 1 hour (or force by deleting the K8s secret; ESO recreates it).

### Verification commands

```bash
# 1. Check ExternalSecret status
kubectl get externalsecret crystolia-whatsapp-secret -n crystolia

# 2. Confirm K8s secret was created and has all 3 keys
kubectl get secret crystolia-whatsapp-secret -n crystolia -o jsonpath='{.data}' | jq 'keys'

# 3. Confirm backend pod has the env vars
kubectl exec -n crystolia deploy/crystolia-backend -- env | grep -E 'ULTRAMSG|ADMIN_PHONE'

# 4. Check backend startup log for UltraMsg status
kubectl logs -n crystolia deploy/crystolia-backend | grep "UltraMsg configured"
# Expected: UltraMsg configured: { hasInstance: true, hasToken: true, hasAdmin: true }
```

### Curl test

```bash
curl -X POST https://staging.crystolia.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","phone":"0501234567","message":"WhatsApp activation test"}'
```

Expected HTTP response: `201 {"success":true,"message":"Lead received successfully","lead":{...}}`

`POST /api/leads` is public (no auth required). Rate-limited to 10 requests/hour per IP. Upserts on phone — reusing the same phone number triggers an update instead of create (still fires WhatsApp notification).

### Success log strings

Check with `kubectl logs -n crystolia deploy/crystolia-backend`:

```
# Startup (on pod start — confirms ESO sync worked):
UltraMsg configured: { hasInstance: true, hasToken: true, hasAdmin: true }

# On lead POST (before send):
✨ Creating new lead for phone: 9720501234567
📬 Lead processed: Test Lead - 9720501234567 (status=new, count=1)
📤 UltraMsg sending: { to: '9720501234567', message: '🌻 Lead Update (new)...' }

# After successful send:
✅ UltraMsg response: { sent: 'true', message: 'ok' }
```

### Failure log strings and meaning

| Log line | Cause | Fix |
|---|---|---|
| `⚠️ [WhatsApp] ADMIN_PHONE_NUMBER is not set. Notification skipped.` | ESO not synced — `ADMIN_PHONE_NUMBER` missing from pod env | Wait up to 1h for ESO refresh, or delete K8s secret to force resync |
| `⚠️ [WhatsApp] UltraMsg configuration missing. Message skipped.` | `ULTRAMSG_INSTANCE_ID` or `ULTRAMSG_TOKEN` missing from pod env | Same — ESO not synced |
| `❌ UltraMsg error: Request failed with status code 401` | Wrong token in AWS SM | Update secret: `aws secretsmanager update-secret --name crystolia/whatsapp --secret-string '...'` |
| `❌ UltraMsg error: Request failed with status code 404` | Wrong instanceId in AWS SM | Update secret with correct instanceId from UltraMsg dashboard |
| `❌ UltraMsg error: timeout of 5000ms exceeded` | UltraMsg API unreachable from cluster | Check EKS egress / security groups; UltraMsg outage |
| `UltraMsg configured: { hasInstance: false, ... }` at startup | AWS SM secret not created yet, or ESO not synced | Create the secret and/or wait for ESO |

### Remaining risks

- **No retry / dead-letter**: WhatsApp send is fire-and-forget. A failed send is logged but not retried and no alert fires.
- **Monitoring alerting unverified**: kube-prometheus-stack is deployed but alerting rules and Grafana dashboard configuration have not been verified. A silent UltraMsg failure won't page anyone.
- **ESO IRSA permissions**: ESO must have `secretsmanager:GetSecretValue` on `crystolia/whatsapp` in its IAM policy. If the secret path is new, verify the IRSA policy covers it before creating the secret.

---

## Repo Structure Context

```
crystolia-app/
  backend/src/
    routes/         # 9 Express router files
    models/         # 7 Mongoose models
    middleware/     # protect, role guards
  frontend-admin/
    app/admin/      # page.tsx (5-tab dashboard), layout.tsx
    app/agent/      # agent workspace
    types/index.ts  # shared TypeScript types
    components/ui/  # Modal, etc.
  frontend-client/
    app/components/ # CustomerDashboard.tsx
    app/[locale]/   # i18n routing
  docs/architecture/
    command-center.html   # ← living architecture document (v2.0)
    architecture-notes.md # ← this file

crystolia-gitops/
  .github/workflows/  # sabbath-mode.yml (mode switching cron)
  apps/               # ArgoCD Application manifests
  charts/             # Helm chart values per service

crystolia-app/
  .github/workflows/
    staging.yml       # push to main → detect changes → build → ECR → update staging/values.yaml
    production.yml    # v* tag → ECR build/push (no GitOps update)
    backend-lock-verify.yml  # PR: verify package-lock.json in sync

crystolia-infra/
  terraform/          # EKS, VPC, ECR, ACM, node groups
```

---

## Cluster Bring-Up Runbook (2026-03-17)

`crystolia-infra/scripts/startup-all.sh` is the canonical bring-up script. It is symmetric to `shutdown-all.sh`.

### Modes

| Command | What it does |
|---|---|
| `bash scripts/startup-all.sh` | Full bring-up (default, same as `up`) |
| `bash scripts/startup-all.sh up` | Full bring-up: Terraform apply → kubeconfig → wait nodes → ArgoCD → ALBs → create `crystolia-backend-secret` |
| `bash scripts/startup-all.sh status` | Read-only health check: cluster state, nodes, namespaces, pod counts, ArgoCD apps, K8s secret presence, ECR |
| `bash scripts/startup-all.sh dry-run` | Pre-flight + `terraform plan` only. No resources created. |

### Secret injection (for `up` mode)

The script creates `crystolia-backend-secret` in the `crystolia` namespace if it does not exist. It will prompt interactively. To avoid prompts (e.g. in a headless session):

```bash
export MONGO_URI="mongodb://crystolia-mongodb:27017/crystolia"
export JWT_SECRET="$(openssl rand -base64 64)"
# optional:
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
bash scripts/startup-all.sh up
```

`JWT_SECRET` is unset from the shell immediately after the `kubectl create secret` call.

### Phases

| Phase | Action | Timeout |
|---|---|---|
| Pre-flight | CLI check, AWS identity, region guard, terraform init, workspace select | — |
| 1 | `terraform apply -auto-approve` | ~20 min |
| 2 | `aws eks update-kubeconfig` + wait for N nodes Ready | 10 min |
| 3 | Wait for ArgoCD server Available + all apps Synced+Healthy | 10 min |
| 4 | Wait for ALBs provisioned by LBC | 5 min |
| 5 | Print new ALB hostnames → must update `dns.tf` manually | — |
| 6 | Wait for `crystolia` namespace Active → create/skip `crystolia-backend-secret` | 2 min |
| 7 | Verification: nodes, pod counts, ECR, MongoDB backup | — |

### Post-startup manual steps (always required)

1. Update `terraform/dns.tf` with new ALB hostnames from Phase 5 output
2. Run `terraform apply -auto-approve` (applies DNS changes)
3. Restore MongoDB from S3 if needed (`s3://crystolia-backups/`)

### What is preserved across shutdown/startup

| Preserved | Why |
|---|---|
| ECR repos + all images | Shutdown script targets destroy excludes them |
| ACM certificate | Not targeted in destroy |
| Route53 records | Not destroyed (but ALB hostnames go stale — must update dns.tf) |
| GitHub OIDC + IAM roles | Not targeted in destroy |
| Terraform S3 state + DynamoDB locks | Never touched by destroy |
| MongoDB S3 backups | S3 bucket not in destroy targets |

### Namespace race condition — resolved

`crystolia-backend-secret` is created in Phase 6, after Phase 3 waits for all ArgoCD apps to be `Synced+Healthy`. The `crystolia` namespace is created by ArgoCD syncing `crystolia-app`. By the time Phase 6 runs, the namespace should exist. Phase 6 also adds an explicit 2-minute wait loop on `namespace/crystolia` phase=Active before attempting secret creation. If the namespace is not ready, the script prints exact manual commands and exits cleanly.

---

## Staging Readiness Checklist (2026-03-17)

All code and infra wiring is complete. The remaining steps are **manual cluster/external-service actions only**.

### Blocking — staging will not start without these

**1. Create K8s secret `crystolia-backend-secret` on the staging cluster**

This secret is not Helm-managed. ArgoCD will not create it. Backend pod will crash (`CrashLoopBackOff`) without it.

```bash
kubectl create secret generic crystolia-backend-secret \
  --namespace crystolia \
  --from-literal=MONGO_URI="mongodb://crystolia-mongodb:27017/crystolia" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)"
```

- `MONGO_URI`: internal cluster DNS — `mongodb://crystolia-mongodb:27017/crystolia`
- `JWT_SECRET`: generate a strong random value with the command above. Store the value — you'll need the same value for production
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: omit for now if not testing Google OAuth (marked `optional: true` in deployment)

**Verify after deploy:**
```bash
kubectl get secret crystolia-backend-secret -n crystolia
kubectl logs -n crystolia deploy/crystolia-backend | head -30
```

---

### Optional — staging runs without these, but specific features won't be testable

**2. Google OAuth login**

Required only to test Google login flow. Email/password auth works without it.

- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `crystolia-backend-secret`:
  ```bash
  kubectl patch secret crystolia-backend-secret -n crystolia \
    --type=merge \
    -p '{"stringData":{"GOOGLE_CLIENT_ID":"<id>","GOOGLE_CLIENT_SECRET":"<secret>"}}'
  ```
- [ ] Register `https://staging.crystolia.com/api/auth/google/callback` in Google Cloud Console → Credentials → OAuth 2.0 client → Authorised redirect URIs

**3. WhatsApp lead notifications (UltraMsg)**

Required only to test WhatsApp pings on new leads. Backend starts and lead creation works without it.

```bash
aws secretsmanager create-secret \
  --name crystolia/whatsapp \
  --region us-east-1 \
  --secret-string '{"instanceId":"<ultramsg-instance>","token":"<ultramsg-token>","adminPhone":"972XXXXXXXXX"}'
```

ESO will sync within 1 hour. Force immediate sync: `kubectl delete secret crystolia-whatsapp-secret -n crystolia`

**4. Green Invoice sandbox (invoice PDF issuance)**

Required only to test the "Issue & PDF" button. All other invoice flows (create, update, list) work without it.

- Fill `secrets.greenInvoice.apiId` and `secrets.greenInvoice.secret` in a `secrets.yaml` override file and redeploy:
  ```bash
  helm upgrade crystolia ./helm/crystolia-chart -f staging/values.yaml -f secrets.yaml -n crystolia
  ```
- Leave `GREEN_INVOICE_SANDBOX: "true"` (already the default)

**5. Verify Grafana/monitoring is operational**

- Access: `https://grafana.crystolia.com` (or port-forward if not exposed in staging)
- Confirm Prometheus is scraping, Loki is receiving logs from Promtail
- Not blocking any application feature

---

### Production-only risks — do not block staging

| Risk | File | Action needed before prod |
|---|---|---|
| Grafana admin placeholder password | `crystolia-gitops/production/grafana-admin-secret.yaml` | Replace `ChangeMeInProduction123!` with real value or route through ESO (`crystolia/grafana-admin` AWS SM path already wired) |
| `GOOGLE_CALLBACK_URL` not set for production | `production/values.yaml` | Add `GOOGLE_CALLBACK_URL: "https://crystolia.com/api/auth/google/callback"` and register in Google Cloud Console |
| Customer portal (`crystolia.com`) not in production ingress | `production/values.yaml` | Add `crystolia.com` host to ingress, add TLS entry |
| Production `crystolia-backend-secret` must use strong `JWT_SECRET` | Manual cluster step | Never use the dev value (`dev-crystolia-secret-key-2026`) — generate `openssl rand -base64 64` |
| `production/values.yaml` has `secrets.whatsapp` block with wrong field names | `production/values.yaml` | Dead config (not consumed by `secret.yaml` template) — remove in a future cleanup |

---

*Last structural update: 2026-03-17 — added WhatsApp Activation Runbook; added Green Invoice caveats; added secrets inventory mismatch table; hardening pass findings; added Staging Readiness Checklist*
*Last verification update: 2026-03-17 — CORS confirmed safe (proxied architecture, no direct browser calls); FRONTEND_URL production bug fixed; dead Supabase send-lead routes deleted; @supabase/supabase-js removed from both frontend packages; mismatch table updated with all open items*
