# Demo Data — safe preparation guide

This guide covers preparing a coherent demo dataset **in local development only**.
Nothing here runs against production, and the tooling refuses to.

## What the demo seed creates

`backend/src/scripts/seedDemo.ts` builds a deterministic story (no randomness —
re-running produces the same dataset):

| Entity | Records | Story |
|---|---|---|
| Suppliers | 2 | Golan Press House, Coastal Packaging |
| Products | 4 | `DEMO-OIL-1L`, `DEMO-OIL-5L`, `DEMO-BOX-S`, `DEMO-BOX-L`, each with opening stock (applied once — re-runs do not inflate inventory) |
| Leads | 2 | one `new`, one `contacted` — the top of the funnel on the admin Leads screen |
| Customers | 3 | Galilee Foods Ltd, Mediterranean Imports, North Market Co (Company + CRM Customer records) |
| Order chains | 3 | one per customer, covering the whole lifecycle (below) |

The three order chains intentionally cover every stage the demo shows:

1. **Galilee Foods** — `completed` order with a full timeline (created → approved →
   completed via shipment delivery), **issued + paid** invoice, posted bank-transfer
   payment, **delivered** shipment.
2. **Mediterranean Imports** — `approved` order, **issued (unpaid)** invoice,
   **pending** shipment.
3. **North Market** — `pending` order, **draft** invoice with no PDF — the customer
   dashboard shows the "PDF available after invoice issuance" state for it.

## How to run it (development only)

```bash
# Start the local stack (Mongo + backend + both frontends)
make up

# Seed (additive, idempotent — safe to re-run)
cd backend && npm run seed:demo

# Wipe demo records and re-seed from scratch
cd backend && npm run reset:demo
```

## Safety properties

- **Environment guard**: the script exits immediately when `NODE_ENV` is set to
  anything other than `development`. Do not remove or bypass this guard.
- **Idempotent**: all records are upserted with `$setOnInsert`; order chains are
  skipped when they already exist; opening stock is applied only once.
- **Scoped reset**: `--reset` only deletes records the seed itself created —
  products with the `DEMO-` SKU prefix, the two named suppliers, leads tagged
  `demo-seed`, and the three named demo companies with their orders, invoices,
  payments and shipments. Real data is never matched.
- **No credentials**: the seed creates no portal login users and contains no
  passwords or secrets.

## What NOT to do

- **Never** run `seed:demo`, `reset:demo`, or `seed` against the production
  database. Do not point `MONGODB_URI` (or `.env`) at Atlas production and run
  seed scripts. The demo to examiners runs against the live system's *real*
  data flows (see `docs/DEMO_RUNBOOK.md`), not seeded data.
- Do not edit the environment guard to make the script run elsewhere.
- Demo customer companies have no portal users; to demo the customer portal
  locally, register through the normal flow and approve the registration from
  the admin console.
