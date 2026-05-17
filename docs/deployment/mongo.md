# MongoDB — Production Readiness

## Replica set requirement

Phases 7–8 introduced **multi-document transactions** (payment posting,
shipment delivery, PO receiving). MongoDB transactions require a **replica
set** (or sharded cluster) — a standalone `mongod` rejects them.

The application **does not require** a replica set to run. `withTransaction`
(`backend/src/db/withTransaction.ts`) probes capability once and **falls back**
to non-transactional execution on a standalone server. So:

- **Standalone mongod** → app works; multi-write flows are *not atomic*.
- **Replica set** → multi-write flows are atomic.

## What the app does

- `diagnosticsService` probes the deployment topology via `hello`.
- **Admin → System** shows the topology and a "Transactions: Supported /
  Fallback mode" badge, with a warning banner when running standalone.
- No crash, no hard failure — the warning is advisory.

## Staging / production checklist

- [ ] MongoDB is deployed as a **replica set** (≥3 members for production,
      1-member RS acceptable for staging).
- [ ] `MONGO_URI` includes the replica set name, e.g.
      `mongodb://host1,host2,host3/crystolia?replicaSet=rs0`.
- [ ] Admin → System shows topology `replica_set` and Transactions `Supported`.
- [ ] Backups are configured (see below).
- [ ] Connection pool sized (`maxPoolSize` is 10 in `db/connection.ts`).

## Single-member replica set (staging)

For staging you can run a 1-member replica set — enough to unlock transactions
without the cost of 3 nodes:

```js
rs.initiate()   // on a mongod started with --replSet rs0
```

`crystolia-gitops/argocd/apps/crystolia-mongodb.yaml` manages the in-cluster
MongoDB; ensure its values request a replica set if transactional atomicity
is needed in that environment.

## Backups

Phase 8 added a **metadata-only** backup layer (`BackupManifest`, Admin →
System → Backups). It records manifests and document counts; it does **not**
perform real dumps. For production you still need real backups:

- `mongodump` on a schedule (cron / k8s CronJob), or
- managed snapshots (Atlas / cloud provider).

Wire real backup execution behind the existing manifest layer in a future
phase (see Phase 10 recommendations).

## Diagnostics

```bash
# Topology from the app
curl https://api-staging.crystolia.com/api/crm/system/diagnostics  # admin auth

# Directly
mongosh "$MONGO_URI" --eval 'db.hello().setName'   # replica set name or null
```

## Indexes

All models declare their indexes in the Mongoose schema; they are created on
first connection. No manual index management is required. For large
collections, confirm index builds completed before heavy load.
