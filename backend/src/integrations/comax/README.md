# Comax connector (`backend/src/integrations/comax`)

A **non-executing stub** implementation of the generic `IERPConnector` for the
Comax ERP. Comax is treated as *one* provider behind the generic layer — none of
its specifics leak into the rest of the platform.

> ⚠️ **Nothing here talks to Comax.** No base URL, no endpoints, no credentials,
> no payloads. `healthCheck()` reports a **disabled** status and every `sync*`
> method throws `not implemented`. The connector is **not registered** with the
> factory and is **not imported** by the running server.

## Files

| File | Role | State |
|---|---|---|
| `ComaxConnector.ts` | extends generic `ERPConnector`; the 8 `sync*` methods + `healthCheck` | stub (throws / disabled) |
| `client/ComaxClient.ts` | HTTP/SOAP transport boundary | placeholder — `request()` throws, `isConfigured()` = false |
| `mapper/comaxMapper.ts` | Comax payload ⇄ canonical DTO mapping | placeholder — every map throws |
| `comaxTypes.ts` | Comax payload shapes + options | all fields **UNKNOWN**, marked as such |
| `README.md` | this file | — |

## What still requires official Comax API documentation

Every item below is blocked on a real Comax integration spec / partner account
(see `../../../docs/integrations/comax-research.md`). Until then these stay stubs:

1. **Auth scheme** — API key? user/secret? OAuth2? IP allowlist? → fills `ComaxClient.auth`.
2. **Base URL(s) & transport** — REST vs SOAP/XML → `ComaxClient.request()` implementation.
3. **Endpoints / operations** per entity (items, customers, stock, orders, documents,
   suppliers, price lists, branches) — **must not be invented**.
4. **Payload field names** for each entity → replaces the `Comax*Raw` shapes and
   implements `comaxMapper`.
5. **Incremental query support** ("changed-since") → drives `SyncContext.since`.
6. **Branch/store id model**, price-list ids, document-type taxonomy.
7. **Rate limits / pagination / webhooks / sandbox** → retry + scheduling tuning.

## How real Comax docs plug in later (no core changes)

1. Replace the `UNKNOWN` shapes in `comaxTypes.ts` with the official field names.
2. Implement `ComaxClient.request()` with the verified transport + auth, reading
   secrets from env (e.g. `process.env.COMAX_BASE_URL`, `COMAX_API_KEY`) — **never
   committed**.
3. Implement `comaxMapper.*` to translate verified payloads ⇄ the canonical DTOs.
4. Implement each `ComaxConnector.sync*` using `runSync` + `withRetry` from the base.
5. Call `registerComaxConnector()` once at composition time to make
   `createConnector({ provider: 'comax', … })` return a live connector.
6. Add the Comax cron entries (see `../scheduler/`) to the job scheduler.

No file outside `comax/` needs to change for any of the above.
