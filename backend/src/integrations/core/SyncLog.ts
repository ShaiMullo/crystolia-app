// ===============================================
// 🧾 SyncLog — pluggable sink for sync outcomes
// ===============================================
// Abstracts WHERE sync results/events are recorded. The default sink writes
// structured lines via opsLogger only — it performs NO database writes.
//
// A DB-backed sink (persisting to the SyncHistory / IntegrationLog models) is
// introduced in a later checkpoint and injected here; the engine never depends
// on a concrete storage backend.

import { opsLogger } from '../../utils/opsLogger.js';
import type { SyncResult } from './syncTypes.js';
import type { ERPProviderId } from '../types/erp.js';

export interface SyncLogEvent {
    provider: ERPProviderId;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    at: Date;
}

/** Strategy interface — any storage backend implements this. */
export interface SyncLogSink {
    /** Record the summarised outcome of a completed sync run. */
    recordResult(result: SyncResult): Promise<void>;
    /** Record a granular event during a run. */
    recordEvent(event: SyncLogEvent): Promise<void>;
}

/**
 * Default sink: structured logs only, zero persistence. Safe to use anywhere
 * because it never touches Mongo or any external system.
 */
export class ConsoleSyncLogSink implements SyncLogSink {
    private readonly logger = opsLogger.forService('erp:sync-log');

    public async recordResult(result: SyncResult): Promise<void> {
        this.logger.info('sync:result', {
            provider: result.provider,
            entity: result.entity,
            mode: result.mode,
            processed: result.processed,
            created: result.created,
            updated: result.updated,
            failed: result.failed,
            deadLettered: result.deadLettered,
            durationMs: result.durationMs,
            dryRun: result.dryRun,
        });
    }

    public async recordEvent(event: SyncLogEvent): Promise<void> {
        this.logger[event.level](event.message, { provider: event.provider, ...event.context });
    }
}

/** The sink the engine uses unless a DB-backed one is injected. */
export const defaultSyncLogSink: SyncLogSink = new ConsoleSyncLogSink();
