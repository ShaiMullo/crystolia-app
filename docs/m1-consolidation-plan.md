# M1 — Freeze & Consolidation Baseline (Plan)

**Status:** Planning (docs only) · **Depends on:** [Architecture Freeze v1](./architecture-freeze-v1.md)

M1 is the **safest, no-behavior-change** consolidation. This document is the
plan; the code steps it describes are **not** done here. No route rewrites, DB
migrations, auth changes, or deploy changes are made by this PR.

---

## 1. Current API route inventory (`backend/src/index.ts`)

Mounted today (no version prefix):

```
/api/auth                 /api/users               /api/leads
/api/crm                  /api/crm/customers       /api/customers     ← dup
/api/crm/tasks            /api/crm/notifications   /api/crm/analytics
/api/crm/products         /api/crm/inventory       /api/crm/orders    ← dup (legacy /api/orders)
/api/crm/payments         /api/crm/shipments       /api/crm/suppliers
/api/crm/purchase-orders  /api/crm/system          /api/crm/exports
/api/orders               /api/companies           /api/invoices
/api/settings             /api/audit
```

### Duplicate / legacy classification
| Resource | legacy `/api/*` | `/api/crm/*` | Live (used by frontend-admin) | Action |
|---|:--:|:--:|---|---|
| customers | ✅ | ✅ | **crm** (`/api/crm/customers`) | crm → canonical; **deprecate legacy** |
| orders | ✅ | ✅ | **crm** (`/api/crm/orders`) | crm → canonical; **deprecate legacy** |
| companies | ✅ | — | **legacy** (`/api/companies`) | legacy → canonical |
| users | ✅ | — | **legacy** (`/api/users`) | legacy → canonical |
| invoices | ✅ | — | (none observed) | legacy → canonical |
| products, inventory, suppliers, payments, shipments, purchase-orders, tasks, notifications, analytics, exports, system | — | ✅ | crm-only | crm → canonical |
| auth, leads, settings, audit | ✅ | — | auth/leads live | legacy → canonical |
| `/api/crm` (root) | — | ✅ | (inspect) | fold into `/api/v1/analytics` or keep as `/api/v1/crm` meta — **TBD in M3** |

**Frontend usage (actual, grep of `frontend-admin`):** only `/api/crm/customers`,
`/api/crm/orders`, `/api/companies`, `/api/users`. `frontend-client` calls only
`/api/debug`. → The blast radius of consolidation is **small and known.**

## 2. Canonical `/api/v1` route map (decision)

Resource-named, no `crm` prefix, grouped by module:

| Module | `/api/v1/...` | Source today |
|---|---|---|
| identity | `auth`, `users` | `/api/auth`, `/api/users` |
| crm | `customers`, `leads`, `companies`, `tasks`, `notifications` | `/api/crm/customers`, `/api/leads`, `/api/companies`, `/api/crm/tasks`, `/api/crm/notifications` |
| catalog | `products` | `/api/crm/products` |
| inventory | `inventory` (+ `/inventory/movements`) | `/api/crm/inventory` |
| sales | `orders` | `/api/crm/orders` |
| procurement | `suppliers`, `purchase-orders`, `shipments` | `/api/crm/{suppliers,purchase-orders,shipments}` |
| accounting | `invoices`, `payments` | `/api/invoices`, `/api/crm/payments` |
| platform | `audit`, `settings`, `analytics`, `exports`, `system` | `/api/audit`, `/api/settings`, `/api/crm/{analytics,exports,system}` |
| integrations | `integrations` (future) | new in M5 |

Conventions to adopt with `/api/v1` (defined now, applied per module later):
response envelope `{ data, meta? }`, error `{ error: { code, message, details? } }`,
Zod-validated input, pagination `?page&limit` (array when omitted — preserves the
current backward-compatible behavior), `orgId` scoping injected from request context.

## 3. Migration plan (old → `/api/v1`) — zero behavior change

Staged, each step independently shippable and reversible:

- **B0 (this PR, docs only):** ratify the map above. No code.
- **B1 — Dual-mount:** mount the **same existing router instances** under
  `/api/v1/<resource>` *in addition to* their current paths. Both work
  identically → zero behavior change, no frontend change required. (One small
  change to `index.ts`; no route logic touched.)
- **B2 — Deprecation signal:** add a `Deprecation` response header + a one-line
  warn log on the legacy/`crm` paths. Still fully functional.
- **B3 — Migrate consumers:** point `frontend-admin` axios calls at `/api/v1/*`
  (only 4 paths: `companies`, `users`, `customers`, `orders`). Ship + verify.
- **B4 — Remove aliases:** after a deprecation window and confirming **no
  remaining consumers** (grep + access-log check), delete the legacy/`crm`
  mounts. The duplicate `customers`/`orders` legacy routers can be deleted once
  B3 lands (frontend already uses the crm versions).

> Order matters: never remove a mount before its consumers move. B1/B2 are safe
> anytime; B3 before B4.

## 4. Security quick wins — **status (re-verified 2026-06-26)**

Most items from the freeze are **already done**; M1 mainly verifies + closes lint.

| Item | Status | M1 action |
|---|---|---|
| CSRF origin `startsWith` bypass | ✅ **Fixed** — `middleware/csrf.ts` now compares exact `new URL(x).origin`, rejects `"null"`/malformed | Verify + add a regression test |
| Committed seed/default passwords (`Admin123!`…) | ✅ **Gone** — no matches repo-wide | Verify in CI (grep guard) |
| `.env` / `admin.cookies` at rest | ✅ **Untracked + gitignored** (`.env`, `*.cookies`, `admin.cookies`) | None (confirm repo is private) |
| Dependency CVEs (Next 16.0.5, axios 1.13.2) | ✅ **Bumped** — Next **16.2.9**, axios **^1.18.0** (admin/client/backend) | None; keep `npm audit` in CI |
| **Backend `npm run lint`** | ❌ **43 problems** (pre-existing `no-explicit-any` etc. in config/middleware/routes/services) | **Baseline then burn down** (see task list) |
| `frontend-client` has no `typecheck` script; its `lint` fails pre-existing | ❌ | Add `typecheck`; baseline lint |

**Net:** M1 security work is light — a lint baseline + a couple of regression
guards, not a remediation sprint.

## 5. Deploy ambiguity — **resolved**

- **What runs on Lightsail (prod):** `docker-compose.demo.yml` → **caddy**
  (TLS/reverse-proxy) + **backend** + **frontend-admin** + **frontend-client**,
  GHCR per-SHA images, deployed via the firewall-gated "Demo Deploy" workflow.
  Prod **DB = MongoDB Atlas** (env overrides the compose's local `mongo:7`).
- **What's on Vercel:** **nothing.** Only `frontend-admin/README.md` and
  `frontend-client/README.md` mention Vercel — **stale/aspirational docs.** No
  `vercel.json`, no Vercel deploy in any workflow.
- **EKS/Helm:** exists for **staging** (`staging.crystolia.com`, ArgoCD) — not
  the prod path.
- **MVP production target (decision):** **standardize on containers-on-Lightsail
  + Mongo Atlas** (what actually works). Fix the two READMEs to remove the
  inaccurate Vercel claim. Treat EKS as a later scale step. Landing stays
  S3/CloudFront.

## 6. Safe M1 task list

**This PR (docs only):**
- [x] `docs/architecture-freeze-v1.md`
- [x] `docs/m1-consolidation-plan.md`

**Next, after this doc merges (each its own small, reversible PR; no business logic):**
1. **B1 dual-mount `/api/v1/*`** in `index.ts` (re-use existing routers) — zero behavior change.
2. **B2 deprecation header/log** on legacy + `crm` paths.
3. **README fix** — remove stale Vercel claims; document the Lightsail + Atlas prod model.
4. **Lint baseline** — record current `backend` lint failures, add `frontend-client` `typecheck`, enable lint in CI as non-blocking, then burn down in small batches.
5. **CI security guards** — grep guard for default passwords; keep `npm audit`.
6. **B3 migrate `frontend-admin`** axios to `/api/v1/*` (4 paths) + verify.
7. **B4 remove legacy/`crm` aliases** after the deprecation window + no-consumer check.

**Explicitly NOT in M1:** new resources/business features, RBAC permission model
(M2), `orgId`/tenant context (M2), DB migrations, transactional invariants (M4),
any deploy-target change.

## 7. Acceptance criteria for M1
- Both docs merged.
- `/api/v1/*` available and identical to current routes (B1), with old paths still working.
- `frontend-admin` on `/api/v1`; legacy `customers`/`orders` duplicates removed.
- Backend lint baselined and trending down; CI guards in place.
- READMEs reflect the real (Lightsail/Atlas) prod model.
- **No behavior change** observable to end users at any step.
