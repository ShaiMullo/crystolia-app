# Crystolia ERP/CRM — Architecture Freeze v1

**Status:** Approved · **Phase:** 1 (Architecture Freeze) · **Date:** 2026-06-26

This document freezes the target architecture for the Crystolia ERP/CRM platform.
It is intentionally conservative: the platform already exists as a working
modular monolith, so the freeze **ratifies and consolidates** rather than
redesigns. Everything in §"Out of scope" is deferred until a milestone demands it.

---

## 0. Framing

This is **not greenfield.** A substantial modular monolith already runs in
production (Express + MongoDB, rich CRM/ERP models, Comax-integration
scaffolding, two Next.js apps). The freeze's job is to **keep the monolith,
close the in-flight inconsistencies, and set guardrails for growth.**

## 1. Current state (inspected 2026-06-26)

| Area | Reality |
|---|---|
| Repo | Monorepo `crystolia-app`: `backend/`, `frontend-admin/`, `frontend-client/`, `landing/` (v1.0 done), `leads-api/`, `helm/`, `terraform-cheap/`, `docs/`. No npm workspaces. |
| Backend | **Express + TypeScript + Mongoose.** Models `I… extends Document` + `timestamps`, soft-delete (`isDeleted/deletedAt`). In-process `setInterval` job scheduler (`ScheduledJob`/`JobRun`). Audit via `logAudit()` + immutable `AuditLog`. |
| DB | **MongoDB Atlas**, single database, single connection. No Redis/queue. |
| Domain models | CRM (Customer, Lead, Company, Task, Notification), ERP (Product, Inventory, InventoryMovement, PurchaseOrder, Supplier, Shipment, Order), Accounting (Invoice, Payment), Platform (User, Settings, AuditLog, AutomationRule), integration logs. |
| Auth | JWT in **httpOnly/secure/sameSite cookies**, `passport` + Google OAuth, CSRF + rate-limit middleware, `tokenVersion` revocation. |
| RBAC | **3 hardcoded roles**: `admin | agent | customer`; `protect → authorize('admin')`. Coarse. |
| API | REST under `/api/...`, **no versioning**. ⚠️ Two overlapping namespaces — legacy (`/api/customers`, `/api/orders`, …) **and** `/api/crm/*`. See the consolidation plan. |
| ERP integration | `integrations/` provider-agnostic layer (`IERPConnector`/`ERPFactory`/`SyncEngine` + Comax **stubs, inert**). `syncableFields` mixin (externalId/externalSource) on Product/Customer/Order/Inventory/Invoice/Supplier. |
| Multi-tenancy | **None.** Single-tenant. `Company` is a CRM entity, not a tenant boundary. |
| Deployment | Prod = **AWS Lightsail** box, `docker-compose.demo.yml` (caddy + backend + frontend-admin + frontend-client), GHCR per-SHA images, Mongo Atlas, firewall-gated SSH "Demo Deploy". EKS/Helm staging exists but is **not** the prod path. **Nothing on Vercel** (READMEs are stale). Landing = S3/CloudFront. |

## 2. Target architecture (decisions)

1. **Modular monolith — keep it.** One Express+TS service with internal domain
   modules (`routes/ service/ model/ dto/`): `identity` · `crm` · `catalog` ·
   `inventory` · `sales` · `procurement` · `accounting` · `integrations` ·
   `platform`. **No microservices.**
2. **One versioned API surface.** Collapse legacy + `crm/*` into a single
   resource-named **`/api/v1/<resource>`** REST surface (consistent envelope +
   error shape, Zod validation, generated OpenAPI). The **future public API is
   this same versioned REST**, later gated by API keys + scopes. No gateway now.
3. **RBAC = role → permission matrix** (not ABAC). Keep `admin/agent/customer`,
   back them with named permissions checked by `authorize(permission)`. Customers
   see only their own records; staff see all (within tenant).
4. **Tenant-ready, single-tenant for MVP.** Add a nullable **`orgId`** to
   tenant-scoped collections **now** (with a compound index) and thread it through
   a request context, but operate single-tenant. Avoids a painful retrofit; does
   not build isolation/billing/per-tenant config yet.
5. **MongoDB stays**, with discipline: **multi-document transactions** for
   money/stock invariants (orders ↔ inventory ↔ payments), explicit indexes
   (incl. the deferred sparse `{externalSource, externalId}`), append-only
   audit/event log as the integration/AI backbone.
6. **Frontends unchanged in shape.** `frontend-admin` (Next/React/Tailwind, he-RTL
   default) = back-office; `frontend-client` = customer portal; both consume
   `/api/v1`. No new SPA framework.
7. **Deployment: one prod target.** Standardize the MVP on the existing
   **containers-on-Lightsail + Mongo Atlas** model (caddy TLS/proxy + 3 app
   containers). EKS/Helm is a **later** scale step. Landing stays S3/CloudFront.
8. **AI / automation / plugins via seams, not engines.** Keep `integrations/` +
   `AutomationRule` + the job runner + audit/event log as extension points. AI
   attaches to those events later. No AI engine, broker, or plugin host now.

```
[ frontend-admin (Next) ]  [ frontend-client (Next) ]  [ landing (S3/CF, v1.0) ]
            \                        /
             \------- /api/v1 ------/
                        |
        ┌───────────────────────────────────────────┐
        │ Express modular monolith (single service)  │
        │ identity·crm·catalog·inventory·sales·       │
        │ procurement·accounting·integrations·platform│
        │ (orgId-scoped, RBAC permissions)            │
        └───────────────┬───────────────┬────────────┘
                        │               │
                 MongoDB Atlas    ERP connectors (Comax) — deferred
               (txns + audit/event log)   via SyncEngine seam
```

## 3. First 5 milestones

| # | Milestone | Outcome |
|---|---|---|
| **M1** | Freeze & consolidation baseline | This doc + the consolidation plan; introduce `/api/v1` (dual-mount, zero behavior change); finish security hygiene (lint baseline; verify the already-done CSRF/CVE/secret fixes). |
| **M2** | Identity & RBAC | Finish user mgmt; role→permission matrix + `authorize(permission)`; add nullable `orgId` + request-scoped tenant context (single default org). |
| **M3** | CRM core hardened | Customers, Leads, Companies, Tasks, Notifications on `/api/v1` — Zod validation, consistent envelope, ownership scoping, tests. |
| **M4** | ERP core | Catalog, Inventory + movements, Sales (Orders), Procurement (Suppliers/POs/Shipments) — **transactional** stock/order invariants. |
| **M5** | Accounting basics + ERP-sync decision | Invoices/Payments; then make the Comax `SyncEngine` real (idempotent + retry/DLQ) **or** formally defer — one documented decision. |

## 4. Out of scope (do NOT build yet)

Microservices · API gateway / service mesh · full multi-tenant isolation
(separate DBs, per-tenant billing/config) · event-sourcing / CQRS · GraphQL ·
real-time / websockets · message broker (Kafka) · the AI automation engine ·
plugin marketplace / host · custom-role ABAC UI · production EKS (until scale
demands) · live Comax sync (until the connector is real).

## 5. Risks / unknowns

- **MongoDB for accounting/inventory integrity** — needs disciplined multi-doc
  transactions; the biggest correctness risk for ERP money/stock.
- **Two unfinished consolidations** (legacy ↔ `crm` API; Lightsail ↔ EKS prod)
  will rot if not closed — M1 closes the API one and ratifies Lightsail.
- **Deferred multi-tenancy** retrofit cost if `orgId` isn't threaded early (M2).
- **Comax integration** scope/complexity (currently all stubs).
- **Single-box prod = SPOF**, no queue/cache — acceptable MVP ceiling.
- **Backend lint** (43 problems) — quality debt to baseline/clean.
- **Velocity/ownership** unknown — milestone sizing assumes current solo cadence.

## 6. Freeze statement

For ERP/CRM v1 we freeze: a single **Express+TS modular monolith** on **MongoDB
Atlas**, **cookie-JWT auth** with a **role→permission RBAC**, an **`orgId`
tenant-ready but single-tenant** data model, a consolidated **versioned `/api/v1`
REST** surface (also the future public API), **two Next.js apps** + the
S3/CloudFront landing, deployed as **containers on one box (Lightsail)** for the
MVP, with **integrations/automation/audit as the AI/plugin seams.** Everything in
§4 is out of scope until a milestone demands it.
