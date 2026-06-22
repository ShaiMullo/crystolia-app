# Comax ERP — Integration Research

> **Status:** Research only. No connection to Comax has been made. This document
> separates **verified facts** from **unknowns** and **assumptions**. Per sprint
> rules, **no API endpoints, authentication methods, or payloads are invented**.
> Anything not publicly verifiable is explicitly marked `UNKNOWN — requires
> official Comax documentation / partner account`.
>
> Last researched: 2026-06-22 · Researcher: Architecture sprint (automated web research)

---

## 1. What Comax is (verified)

- **Comax** (קומקס / "Comax Smart ERP", "COMAX Cloud Smart ERP") is an **Israeli
  ERP system focused on the retail world**, combining catalog, procurement, sales,
  inventory, finance, employee/service management modules.
- Vendor site: **https://comaxerp.com** (Hebrew + English). Company based in Bnei Brak, Israel.
- It is a mature, retail-oriented, partly cloud ("Cloud Smart ERP") product. Backed by Apax Partners.
- It is widely used by Israeli retailers and is commonly integrated with **e-commerce
  platforms** (Shopify, WooCommerce, Magento) and **logistics/shipping** providers
  through **third-party connector apps**, not (publicly) through a self-serve developer API.

**Sources**
- https://comaxerp.com/en/ , https://comaxerp.com/en/erp-system/
- https://apps.shopify.com/matat-comax-erp (Matat "Comax ERP" Shopify connector)
- https://www.lionwheel.com/he/integrations-he/comax (LionWheel shipping connector)
- https://www.apax.com/partnerships/comax/ , https://tracxn.com/d/companies/comax/

---

## 2. Integration surface — what is publicly verifiable

### 2.1 Verified facts

| Topic | Finding | Evidence |
|---|---|---|
| Integration is possible | Yes — multiple live commercial connectors exist (Matat for Shopify, LionWheel for shipping). | Shopify App Store listing; LionWheel integrations page |
| "API access" exists | The Matat Shopify connector states **"API access to Comax is required"** for integration. So Comax exposes *some* programmatic interface to credentialed partners/customers. | Matat Shopify listing |
| Data domains synced in practice | **Products** (price, variants, SKU, barcode), **Inventory/stock**, **Orders**, **Customers** (name, email, phone, address). | Matat Shopify listing |
| Sync direction | **Bidirectional** in practice: orders Shopify→Comax; inventory/products Comax→storefront. | Matat Shopify listing |
| Sync cadence offered by connectors | Scheduled (e.g. "up to 4× stock sync daily") **and** near-"real-time" tiers. Implies both polling and a faster push/near-real-time mechanism are achievable. | Matat Shopify listing |
| Multi-store / multi-branch | Connectors reference a **"Store ID list"** identifying which Comax stores/branches sync, and a **"Comax Shipping ID"** for default shipping method. Comax is multi-branch by design. | Matat Shopify listing |
| EDI | Comax supports **EDI** for receipt/transmission of orders, delivery notes, and customer return delivery notes ("secure EDI"). | comaxerp.com / partner descriptions |

### 2.2 Unknowns — require official Comax documentation or a partner/customer account

The following could **not** be verified from public sources and **must not be assumed**:

- **API style** — REST vs SOAP vs GraphQL vs proprietary HTTP/XML. `UNKNOWN`.
  (One third-party software-directory review even claims "Comax does not offer an API";
  this conflicts with the Matat "API access required" statement, so the public signal is
  contradictory — treat the exact surface as unverified.)
- **Base URL(s) / endpoints / resource paths.** `UNKNOWN` — none published; **do not invent.**
- **Authentication scheme** — API key? Username/password? OAuth2? Per-branch token?
  IP allowlist? mTLS? `UNKNOWN`.
- **Request/response payload formats** (JSON? XML? field names). `UNKNOWN` — **do not invent.**
- **Webhooks / push callbacks** — whether Comax can call out to us on change events,
  or whether integration is poll-only. `UNKNOWN` (the "real-time" connector tier hints at
  push or short-interval polling, but the mechanism is not public).
- **Official SDK** — no public, officially-published Comax SDK (npm/NuGet/etc.) was found. `UNKNOWN/none-found`.
- **Official developer documentation portal** — no public self-serve API docs portal found.
  Docs appear to be provided to partners/customers under account. `UNKNOWN`.
- **Rate limits / quotas / pagination model.** `UNKNOWN`.
- **Sandbox / test environment availability.** `UNKNOWN`.
- **Versioning / deprecation policy.** `UNKNOWN`.
- **Idempotency / conflict-resolution semantics** for bidirectional sync. `UNKNOWN`.

### 2.3 Assumptions (clearly labelled — to be validated with Comax, not relied on)

These are *working assumptions* to shape a generic, defensive architecture. They are
**not facts** and the code must not hard-depend on them:

- **A1** — Comax exposes an HTTP-based interface (REST-ish or SOAP/XML) reachable by
  credentialed clients; integration is request/response over HTTPS.
- **A2** — Authentication is credential-based (key or user/secret), possibly combined with
  an **IP allowlist** (common for Israeli ERP/financial integrations). Build the connector so
  the auth strategy is pluggable.
- **A3** — Primary integration model is **pull/poll on a schedule** for catalog/inventory and
  **push** for orders; design for both, do not assume webhooks exist.
- **A4** — Entities map roughly to our domain: Comax *items/products*, *stock per branch*,
  *customers*, *orders/documents*, *price lists*, *branches/warehouses*.
- **A5** — Each Comax **branch/store has an ID**; inventory and pricing are branch-scoped.
- **A6** — Data volumes are retail-scale (thousands–tens of thousands of SKUs); incremental
  sync (changed-since) will be required, not just full sync.

---

## 3. Capability checklist (what we asked vs. what we found)

| Capability | Public answer |
|---|---|
| REST API | Not publicly documented. `UNKNOWN` |
| SOAP / Web Services | Plausible (legacy Israeli ERP commonly SOAP/XML); not confirmed publicly. `UNKNOWN` |
| GraphQL | No evidence. `UNKNOWN` (assume no) |
| EDI | **Yes** (orders, delivery notes, returns) — verified |
| OAuth | No evidence. `UNKNOWN` |
| API Keys | Plausible ("API access required"); exact scheme `UNKNOWN` |
| IP Whitelist | Common for this class of product; `UNKNOWN` |
| Webhooks | No public evidence. `UNKNOWN` |
| Official SDK | None found. `UNKNOWN/none` |
| Official API docs portal | None public; partner/account-gated. `UNKNOWN` |
| Integration partners | **Yes** — Matat (Shopify), LionWheel (shipping), and others. Verified |
| Rate limits | `UNKNOWN` |
| Sandbox | `UNKNOWN` |

---

## 4. How to obtain the real, authoritative information

To replace every `UNKNOWN` above with verified fact, the business must:

1. **Contact Comax directly** (https://comaxerp.com) and request the **integration / API
   technical specification** for the customer's account and modules.
2. Ask specifically for: API style + base URLs, authentication method, whether an
   **IP allowlist** is required (and from which egress IPs), endpoint/resource list,
   payload schemas, pagination, rate limits, **changed-since/incremental** query support,
   webhook availability, and **sandbox** credentials.
3. Request **branch/store IDs**, **price-list IDs**, **warehouse/location mapping**, and the
   **document/order type** taxonomy used by this Comax account.
4. Consider engaging an **existing certified Comax integrator** (e.g. the team behind the
   Matat connector) to short-circuit discovery.
5. Obtain a **test/sandbox environment** before writing any live client code.

Until the above is in hand, the Crystolia ERP layer stays **generic and provider-agnostic**
(see `backend/src/integrations/`), and the Comax connector remains a **non-executing stub**.

---

## 5. Recommendations for the Crystolia side (independent of Comax specifics)

- Keep a **generic ERP connector interface**; Comax is one implementation. (Done in this sprint.)
- Treat auth, transport, and field-mapping as **pluggable strategies** so any of the unknown
  schemes (key / OAuth / IP-allowlist / SOAP / REST) can be slotted in without redesign.
- Persist **`rawExternalData`** per synced record so we can debug mapping against real Comax
  payloads once they're known. (Added via the syncable fields — see DB prep.)
- Design for **incremental ("changed-since") sync** and **idempotent upserts keyed on
  `externalId` + `externalSource`**, since bidirectional retail sync will produce conflicts.
- Do **not** ship any Comax base URL, credential, or endpoint until verified from Comax.

---

## 6. Open questions for the business (decisions required)

1. Which Comax **modules** are licensed (catalog, inventory, sales, finance, EDI)?
2. Which **direction** matters first — Comax→Crystolia (catalog/stock) or Crystolia→Comax (orders)?
3. Is this **one branch or many**? Which branch IDs / price lists?
4. Is **real-time** required, or is scheduled (e.g. hourly/4×-daily) acceptable for v1?
5. Who owns the **Comax credentials** and the **egress IP allowlisting** on our infra?

---

*References (accessed 2026-06-22):*
- Comax official — https://comaxerp.com/en/ , https://comaxerp.com/en/erp-system/ , https://comaxerp.com/en/service-management-system/
- Matat Comax ERP (Shopify) — https://apps.shopify.com/matat-comax-erp , https://matat.co.il/article/matat-comax-erp-app-documentation/
- LionWheel × Comax — https://www.lionwheel.com/he/integrations-he/comax
- Company/market — https://www.apax.com/partnerships/comax/ , https://tracxn.com/d/companies/comax/ , https://a2is.com/catalog/enterprise-resource-planning-software/comax-erp-system
