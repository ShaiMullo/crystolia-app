// ===============================================
// ⏰ ERP cron DEFINITIONS (architecture only — NOT registered)
// ===============================================
// Declarative description of the recurring jobs a live ERP integration WOULD
// run. This file is pure data + types:
//   • nothing here is imported by jobs/scheduler.ts
//   • no job is seeded, registered, or ticked
//   • no Comax call, no DB access, no handler is invoked
//
// The shape intentionally mirrors the existing `JobDefinition` in
// jobs/scheduler.ts (key/name/description/intervalMs) so these can later be
// merged into the real scheduler with minimal glue — but ONLY after a
// deliberate go-live decision. Every entry ships with `enabled: false`.

import type { ERPProviderId } from '../types/erp.js';
import type { SyncDirection, SyncEntity, SyncMode } from '../core/syncTypes.js';

const HOUR = 3_600_000;

/**
 * Superset of the scheduler's JobDefinition, with ERP-specific metadata. The
 * first four fields are byte-compatible with jobs/scheduler.ts `JobDefinition`.
 */
export interface ERPCronDefinition {
    key: string;
    name: string;
    description: string;
    intervalMs: number;
    // ---- ERP-specific, ignored by the generic scheduler ----
    provider: ERPProviderId;
    entity?: SyncEntity;
    mode: SyncMode;
    direction: SyncDirection;
    /** ALWAYS false here — these are not live. */
    enabled: false;
}

/**
 * Generic, provider-agnostic cadence template. `provider` is a placeholder
 * ('__generic__') — clone these per real provider when wiring a connector.
 * NONE of these are registered.
 */
export const GENERIC_ERP_CRON_TEMPLATE: ERPCronDefinition[] = [
    {
        key: 'erp_sync_products',
        name: 'ERP · sync products',
        description: 'Pull catalog (sku/price/barcode) from the ERP into the product catalog.',
        intervalMs: 6 * HOUR,
        provider: '__generic__',
        entity: 'products',
        mode: 'incremental',
        direction: 'pull',
        enabled: false,
    },
    {
        key: 'erp_sync_customers',
        name: 'ERP · sync customers',
        description: 'Reconcile customer master data with the ERP.',
        intervalMs: 12 * HOUR,
        provider: '__generic__',
        entity: 'customers',
        mode: 'incremental',
        direction: 'bidirectional',
        enabled: false,
    },
    {
        key: 'erp_sync_inventory',
        name: 'ERP · sync inventory',
        description: 'Pull per-branch stock levels from the ERP (highest frequency).',
        intervalMs: 1 * HOUR,
        provider: '__generic__',
        entity: 'inventory',
        mode: 'incremental',
        direction: 'pull',
        enabled: false,
    },
    {
        key: 'erp_sync_orders',
        name: 'ERP · sync orders',
        description: 'Push new/updated sales orders to the ERP.',
        intervalMs: 1 * HOUR,
        provider: '__generic__',
        entity: 'orders',
        mode: 'incremental',
        direction: 'push',
        enabled: false,
    },
    {
        key: 'erp_health_check',
        name: 'ERP · health check',
        description: 'Probe ERP reachability/auth and record connection health.',
        intervalMs: 0.25 * HOUR,
        provider: '__generic__',
        mode: 'scheduled',
        direction: 'pull',
        enabled: false,
    },
    {
        key: 'erp_retry_queue',
        name: 'ERP · retry / dead-letter drain',
        description: 'Re-attempt failed sync jobs and surface dead-lettered items.',
        intervalMs: 0.5 * HOUR,
        provider: '__generic__',
        mode: 'scheduled',
        direction: 'bidirectional',
        enabled: false,
    },
];

/**
 * Comax-specific FUTURE placeholders. Identical cadence template, tagged with
 * the 'comax' provider id. Still `enabled: false`, still not registered. Cadences
 * are conservative defaults and MUST be revisited against real Comax rate limits
 * (currently UNKNOWN — see docs/integrations/comax-research.md).
 */
export const COMAX_CRON_DEFINITIONS: ERPCronDefinition[] = GENERIC_ERP_CRON_TEMPLATE.map(
    (def) => ({
        ...def,
        key: def.key.replace(/^erp_/, 'comax_'),
        name: def.name.replace(/^ERP ·/, 'Comax ·'),
        provider: 'comax',
        enabled: false,
    }),
);

/**
 * How to wire these into the live scheduler LATER (do NOT do this now):
 *
 *   1. Implement + register the connector (registerComaxConnector()).
 *   2. Add a handler per key to jobs/handlers.ts that calls
 *      SyncEngine.runOnce(connector, entity, { mode, direction }).
 *   3. Map each ERPCronDefinition → the scheduler's JobDefinition
 *      ({ key, name, description, intervalMs }) and append to JOB_DEFINITIONS.
 *   4. Flip `enabled` per job via the existing admin Jobs UI.
 *
 * Until all four steps happen deliberately, this module does nothing.
 */
export const ERP_CRON_REGISTERED = false;
