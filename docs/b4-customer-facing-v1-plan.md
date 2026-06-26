# B4-new — Customer-facing `/api/v1` Migration Plan

**Status:** Planning (docs only) · **Depends on:** [M1 consolidation plan](./m1-consolidation-plan.md)

This plan replaces the original **B4** ("remove the legacy `/api/customers` &
`/api/orders` duplicate routers"). Discovery proved those are **not** duplicates —
they are the **customer-facing** API consumed by `frontend-client`. This document
is the plan only; **no code is changed here**, and **nothing is removed** until
the final stage after a no-consumer check.

---

## 0. Why the original B4 was cancelled

B4 assumed `/api/customers` and `/api/orders` were dead admin duplicates because
`frontend-admin` had migrated its CRUD to `/api/v1/{customers,orders}` (the CRM
routers). Discovery showed otherwise:

- `/api/customers` is **customer self-service** (`/my-profile`, `/complete-profile`,
  `/update-profile`) — a different router from `crmCustomersRouter`.
- `/api/orders` is **customer-facing order flow** (place order, list own) **plus**
  an admin/agent status update — a different router from `crmOrdersRouter`.
- `frontend-client` actively consumes both.
- `/api/v1/customers` and `/api/v1/orders` point at the **admin CRM** routers and
  do **not** serve these endpoints, so they are **not equivalent successors**.

Removing the mounts would have **broken customer onboarding, profile editing, and
order placement**. PR #38 already corrected the misleading B2 deprecation headers
on these two mounts.

## 1. `/api/customers/*` endpoint inventory (`customersRouter`)

Router-level guard: `router.use(protect)`; every route additionally
`authorize('customer')`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/my-profile` | customer | own profile (+ populated company) |
| POST | `/complete-profile` | customer | onboarding (create/link company) |
| PATCH | `/update-profile` | customer | edit own profile |

## 2. `/api/orders/*` endpoint inventory (`ordersRouter`)

Router-level guard: `router.use(protect)`; per-route roles — **mixed audience**.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/` | customer | place an order |
| GET | `/` | any auth — **role-aware** | customer → own company's orders; admin/agent → all (optional `?companyId`) |
| PATCH | `/:id` | admin, agent | update order status |

> For contrast, `/api/v1/customers` & `/api/v1/orders` are **admin-only CRM**
> (`crmCustomersRouter` / `crmOrdersRouter`: `protect` + `authorize('admin')`,
> full CRUD + `/preview`). They are legitimately taken and unrelated to the
> customer surface.

## 3. frontend-client consumer map

`frontend-client` axios `baseURL` resolves to `/api`, so a relative `/orders`
call hits `/api/orders`.

### A. Real customer portal — **migration targets**
| File | Call | Backend today |
|---|---|---|
| `app/components/OnboardingPage.tsx:83` | `POST /customers/complete-profile` | ✅ exists |
| `app/components/CustomerDashboard.tsx:176` | `POST /customers/complete-profile` | ✅ exists |
| `app/components/CustomerDashboard.tsx:174` | `PATCH /customers/update-profile` | ✅ exists |
| `app/components/CustomerDashboard.tsx:86,226` | `GET /orders` (own) | ✅ exists (customer branch) |
| `app/components/CustomerDashboard.tsx:218` | `POST /orders` (place) | ✅ exists |

### B. Non-functional today — **NOT migration targets** (backend route missing → 404)
| File | Call | Status |
|---|---|---|
| `app/[locale]/orders/[id]/pay/page.tsx:30` | `GET /orders/:id` | ❌ no such route in `orders.ts` |
| `app/[locale]/orders/[id]/pay/page.tsx:45` | `PATCH /orders/:id/payment-method` | ❌ no such route |
| `app/[locale]/orders/[id]/pay/page.tsx:50` | `POST /payments/create` | ❌ no `/api/payments` mounted (only `/api/crm/payments`, admin) |

### C. Legacy admin-in-client — **separate concern** (not customer-facing)
| File | Calls |
|---|---|
| `app/components/AdminDashboard.tsx` | `GET /orders` (93, 336, 361); `GET /customers` (94 — ❌ 404, router has no `GET /`); `POST /orders/:id/approve` (331 — ❌ 404); `PATCH /orders/:id` (348, admin/agent) |

## 4. Missing / non-functional endpoints discovered

A backend-wide search found **no** handler for the order detail/payment flow
called by `frontend-client`:

- `GET /api/orders/:id` — not defined (orders.ts has only `POST /`, `GET /`, `PATCH /:id`).
- `PATCH /api/orders/:id/payment-method` — not defined anywhere.
- `POST /api/payments/create` — no `/api/payments` router is mounted.
- `POST /api/orders/:id/approve` (AdminDashboard) — not defined.
- `GET /api/customers` (AdminDashboard) — `customersRouter` has no `GET /`.

These calls **404 today** — they are broken/aspirational features, not things to
migrate. Building them (e.g. a real customer order-detail + payment surface) is
**separate product work**, out of scope for this migration.

## 5. Auth / role assumptions

- **Customer-only:** all three profile routes; `POST /orders`.
- **Role-aware (one endpoint, two audiences):** `GET /orders` — customer sees own
  (`query = { company: user.company }`), admin/agent sees all. This is the key
  design wrinkle: the customer surface must serve **only** the customer branch.
- **Admin/agent-only:** `PATCH /orders/:id` — already has a v1 home at
  `/api/v1/orders/:id` (crmOrders).

## 6. Recommended route design — `/api/v1/me/*`

A namespace for **the authenticated user's own resources**.

| New (recommended) | Replaces |
|---|---|
| `GET /api/v1/me/profile` | `GET /api/customers/my-profile` |
| `POST /api/v1/me/profile/complete` | `POST /api/customers/complete-profile` |
| `PATCH /api/v1/me/profile` | `PATCH /api/customers/update-profile` |
| `POST /api/v1/me/orders` | `POST /api/orders` (place) |
| `GET /api/v1/me/orders` | `GET /api/orders` **(customer-scoped only)** |

**Why `/me`** (over `/api/v1/customer/*`, `/api/v1/portal/*`,
`/api/v1/me/customer-profile`): it denotes "the current authenticated user's own
data," is an industry convention (GitHub `/user`, Stripe), self-documents the
customer-scoping, reads cleanest, and **cannot collide** with the admin
`/api/v1/customers` / `/api/v1/orders`. It also resolves the role-aware `GET /orders`
split by **audience**: customers use `/api/v1/me/orders` (own only); admins keep
`/api/v1/orders` (all).

## 7. Staged implementation plan

- **B4.1 — backend, additive (zero behavior change).** Add a small `meRouter`
  mounted at `/api/v1/me` exposing the five customer routes above, **reusing the
  existing handler logic**. Recommended: first extract the customer handlers from
  `customers.ts` / `orders.ts` into shared service functions so the old and new
  routes share one implementation and cannot drift. `/api/customers` and
  `/api/orders` stay fully intact; admin order ops are **not** placed under `/me`.
- **B4.2 — migrate frontend-client (customer portal only).** Repoint
  `CustomerDashboard.tsx` and `OnboardingPage.tsx` to `/api/v1/me/*` (URL-only,
  like B3/B3.2). Handle the legacy `AdminDashboard.tsx` **separately** (retire it
  or point it at `/api/v1` admin CRM); treat the 404 pay-flow endpoints as
  product work.
- **B4.3 — deprecate old.** Add `deprecatedRoute()` to `/api/customers` &
  `/api/orders` with the **correct** successors (`/api/v1/me/*`), only once no
  customer consumer remains.
- **B4.4 — remove old mounts** after a repo-wide no-consumer check (including the
  resolved fate of the legacy `AdminDashboard`).

## 8. Risks

1. **Mixed `ordersRouter`** — `GET /` is role-aware; `/api/v1/me/orders` must serve
   only the customer branch (filter by `req.user.company`). Don't expose admin ops
   under `/me`.
2. **Legacy `AdminDashboard` in frontend-client** — calls admin-ish endpoints (some
   already 404). Not customer-facing; conflating it expands scope. Decide its fate
   separately.
3. **Broken pay flow** — `GET /orders/:id`, `payment-method`, `payments/create`
   don't exist in the backend. Cannot be migrated (nothing to alias); building them
   is separate product work.
4. **Handler reuse / drift** — handler logic is inline in the route files; B4.1
   should extract to shared functions to avoid two diverging implementations.
5. **No backend tests** — onboarding and order placement are high-value flows;
   correctness rests on typecheck/build + staging smoke.
6. **Response-shape parity** — keep `/api/v1/me/*` responses byte-identical so B4.2
   is a URL-only change.

## 9. What NOT to remove yet

Keep mounted and functional: **`/api/customers`**, **`/api/orders`** (both routers
+ mounts), **`/api/v1/customers`**, **`/api/v1/orders`** (admin CRM), all
**`/api/crm/*`**, and the **`/api/crm` root**. **Nothing is removed until B4.4**,
after a no-consumer check.
