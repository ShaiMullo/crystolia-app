# ERP Integration Layer (`backend/src/integrations`)

A **generic, provider-agnostic** integration layer that lets Crystolia connect to
**any** ERP (Comax, Priority, SAP Business One, NetSuite, Microsoft Dynamics, …).
Comax is intentionally **just one future implementation**, not hardcoded anywhere.

> ⚠️ **Inert by design.** Nothing in this folder is imported by the running server
> (`index.ts`), the scheduler, or any route. It registers no jobs, opens no
> connections, ships no credentials/endpoints, and performs no database writes.
> Concrete vendor sync methods throw `not implemented` until official ERP API
> documentation exists.

## Structure

```
integrations/
  index.ts                 Public barrel (import surface)
  types/
    erp.ts                 Canonical, vendor-neutral DTOs (ERPProductDTO, …)
  core/
    syncTypes.ts           Enums, ConnectorConfig, SyncContext, SyncResult, RetryPolicy
    IERPConnector.ts       The contract every ERP implements
    ERPConnector.ts        Abstract base: state, logger, retry, runSync scaffolding
    ERPFactory.ts          Registry: register/create connectors by provider id
    SyncEngine.ts          Orchestrator: modes + queue seam + dead-letter seam + retry
    SyncLog.ts             Pluggable sink for sync outcomes (console default; DB later)
  comax/                   (added in a later checkpoint — non-executing stub)
  scheduler/               (added in a later checkpoint — cron *definitions* only)
```

## What is generic vs vendor-specific

| Generic (here, today) | Vendor-specific (per connector) |
|---|---|
| `IERPConnector` contract | mapping vendor payload ⇄ canonical DTOs |
| `ERPConnector` base (retry, logging, timing) | auth handshake, transport (REST/SOAP/…) |
| `SyncEngine`, `SyncQueue`, `DeadLetterSink` | endpoint/resource paths, pagination |
| `SyncLog` sinks, canonical DTOs, `ConnectorConfig` | rate-limit handling, field semantics |
| `ERPFactory` registry | the concrete connector class itself |

## How a future Comax connector plugs in

1. **Implement** `class ComaxConnector extends ERPConnector` and provide the eight
   `sync*` methods + `healthCheck` (mapping Comax payloads to the canonical DTOs in
   `types/erp.ts`). No core file changes.
2. **Register** it once, at composition time:
   ```ts
   import { registerConnector } from './core/ERPFactory.js';
   import { ComaxConnector } from './comax/ComaxConnector.js';
   registerConnector('comax', ComaxConnector);
   ```
3. **Use** it anywhere without naming Comax:
   ```ts
   const connector = createConnector({
     provider: 'comax',
     baseUrl: process.env.COMAX_BASE_URL,      // runtime-injected, never committed
     auth: { strategy: 'apiKey', credentials: { key: process.env.COMAX_API_KEY! } },
     branchIds: ['001'],
   });
   const engine = new SyncEngine();
   await engine.runOnce(connector, 'products', { mode: 'incremental', direction: 'pull' });
   ```
4. To swap to a different ERP, register a different class under a different
   provider id — **no call sites change.**

## Status

Checkpoint 2 delivers the generic core only. Auth strategy, transport, endpoints
and field mappings stay open precisely because the real Comax API surface is still
unknown (see `docs/integrations/comax-research.md`).
