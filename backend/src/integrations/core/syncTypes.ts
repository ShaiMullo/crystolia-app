// ===============================================
// ⚙️ Sync primitives (provider-agnostic)
// ===============================================
// Shared enums, config and result shapes used by the connector interface and
// the sync engine. No vendor specifics. No secrets are stored in these types —
// credentials are injected at runtime (from env/secret store), never persisted here.

import type { ERPProviderId } from '../types/erp.js';

/** Which entity domain a sync operates on. */
export type SyncEntity =
    | 'products'
    | 'customers'
    | 'inventory'
    | 'orders'
    | 'invoices'
    | 'suppliers'
    | 'priceLists'
    | 'warehouses';

/** How a sync is triggered / scoped. */
export type SyncMode = 'full' | 'incremental' | 'manual' | 'scheduled';

/** Direction of data flow relative to Crystolia. */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/** Mirrors the `syncStatus` enum used on the Mongoose models. */
export type SyncStatus = 'never' | 'pending' | 'synced' | 'error';

/** Live connection state of a connector instance. */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Pluggable authentication descriptor. The *strategy* is declared here; the
 * actual secret values are supplied at runtime and must NOT be committed.
 * This keeps the design open to whatever Comax (or any ERP) turns out to need.
 */
export interface AuthConfig {
    strategy: 'none' | 'apiKey' | 'basic' | 'oauth2' | 'ipAllowlist' | 'custom';
    /** Injected at runtime (e.g. from process.env). Empty/omitted in source. */
    credentials?: Record<string, string>;
}

export interface RetryPolicy {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoff: 'fixed' | 'exponential';
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
    backoff: 'exponential',
};

/**
 * Everything needed to construct a connector — provider-agnostic.
 * No real base URL or credential ships in source; these are runtime-injected.
 */
export interface ConnectorConfig {
    provider: ERPProviderId;
    /** Runtime-injected. Unknown for Comax until official docs arrive. */
    baseUrl?: string;
    auth?: AuthConfig;
    /** Branch/store ids to scope inventory & pricing (Comax is multi-branch). */
    branchIds?: string[];
    defaultPriceListId?: string;
    timeoutMs?: number;
    retry?: RetryPolicy;
    /** Free-form provider-specific knobs without leaking into the core types. */
    options?: Record<string, unknown>;
}

export interface HealthStatus {
    provider: ERPProviderId;
    healthy: boolean;
    state: ConnectionState;
    checkedAt: Date;
    latencyMs?: number;
    message?: string;
}

/** Context passed into every sync call. */
export interface SyncContext {
    mode: SyncMode;
    direction: SyncDirection;
    /** For incremental sync — only pull/push records changed since this time. */
    since?: Date;
    /** When true, compute the plan but perform no writes. */
    dryRun?: boolean;
    /** Correlates logs/audit across one sync run. */
    correlationId?: string;
}

export interface SyncRecordError {
    externalId?: string;
    code?: string;
    message: string;
    raw?: unknown;
}

/** Outcome of a single sync run for one entity. */
export interface SyncResult {
    provider: ERPProviderId;
    entity: SyncEntity;
    mode: SyncMode;
    direction: SyncDirection;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    deadLettered: number;
    errors: SyncRecordError[];
    dryRun: boolean;
}

/** Helper to build an empty result envelope at the start of a run. */
export function emptySyncResult(
    provider: ERPProviderId,
    entity: SyncEntity,
    ctx: SyncContext,
): SyncResult {
    const now = new Date();
    return {
        provider,
        entity,
        mode: ctx.mode,
        direction: ctx.direction,
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        deadLettered: 0,
        errors: [],
        dryRun: Boolean(ctx.dryRun),
    };
}
