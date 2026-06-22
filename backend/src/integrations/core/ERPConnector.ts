// ===============================================
// 🧱 ERPConnector — abstract base for every connector
// ===============================================
// Provides the shared, provider-agnostic scaffolding so concrete connectors
// (ComaxConnector, future PriorityConnector, …) only implement vendor specifics:
//   • connection-state tracking
//   • a structured logger bound to the provider
//   • a retry helper honouring the configured RetryPolicy
//   • a `runSync` wrapper that times the operation and builds a SyncResult
//
// NO network calls, NO endpoints, NO credentials here. Concrete sync methods are
// abstract and are expected to throw `notImplemented(...)` until real ERP docs exist.

import { opsLogger } from '../../utils/opsLogger.js';
import type { IERPConnector } from './IERPConnector.js';
import {
    DEFAULT_RETRY_POLICY,
    emptySyncResult,
    type ConnectionState,
    type ConnectorConfig,
    type HealthStatus,
    type RetryPolicy,
    type SyncContext,
    type SyncEntity,
    type SyncResult,
} from './syncTypes.js';
import type { ERPProviderId } from '../types/erp.js';

export abstract class ERPConnector implements IERPConnector {
    public readonly provider: ERPProviderId;
    protected readonly config: ConnectorConfig;
    protected readonly retry: RetryPolicy;
    protected state: ConnectionState = 'disconnected';
    protected readonly logger: ReturnType<typeof opsLogger.forService>;

    protected constructor(config: ConnectorConfig) {
        this.provider = config.provider;
        this.config = config;
        this.retry = config.retry ?? DEFAULT_RETRY_POLICY;
        this.logger = opsLogger.forService(`erp:${config.provider}`);
    }

    // ---- lifecycle defaults (override as needed) ----

    public async connect(): Promise<void> {
        this.state = 'connecting';
        this.logger.info('connect() — base no-op; override in concrete connector');
        this.state = 'connected';
    }

    public async disconnect(): Promise<void> {
        this.logger.info('disconnect() — base no-op; override in concrete connector');
        this.state = 'disconnected';
    }

    public abstract healthCheck(): Promise<HealthStatus>;

    // ---- sync surface (must be implemented by concrete connector) ----
    public abstract syncProducts(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncCustomers(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncInventory(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncOrders(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncInvoices(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncSuppliers(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncPriceLists(ctx: SyncContext): Promise<SyncResult>;
    public abstract syncWarehouses(ctx: SyncContext): Promise<SyncResult>;

    // ---- shared helpers for concrete connectors ----

    /** Signals an intentionally-unimplemented capability. */
    protected notImplemented(method: string): never {
        throw new Error(
            `[${this.provider}] ${method}() is not implemented — awaiting official ERP API documentation.`,
        );
    }

    /**
     * Times a sync operation and returns a populated SyncResult. The concrete
     * connector supplies `work`, which mutates the result envelope as it goes.
     * No DB writes happen here — persistence is the SyncEngine/SyncLog's job.
     */
    protected async runSync(
        entity: SyncEntity,
        ctx: SyncContext,
        work: (result: SyncResult) => Promise<void>,
    ): Promise<SyncResult> {
        const result = emptySyncResult(this.provider, entity, ctx);
        const started = Date.now();
        this.logger.info('sync:start', { entity, mode: ctx.mode, direction: ctx.direction });
        try {
            await work(result);
        } finally {
            result.finishedAt = new Date();
            result.durationMs = Date.now() - started;
            this.logger.info('sync:end', {
                entity,
                durationMs: result.durationMs,
                processed: result.processed,
                failed: result.failed,
            });
        }
        return result;
    }

    /**
     * Retry wrapper honouring the connector's RetryPolicy. Pure timing/backoff —
     * the actual operation is whatever `fn` is. Used by concrete connectors and
     * the SyncEngine.
     */
    protected async withRetry<T>(fn: () => Promise<T>, label = 'op'): Promise<T> {
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            attempt += 1;
            try {
                return await fn();
            } catch (err) {
                if (attempt >= this.retry.maxAttempts) {
                    this.logger.error('retry:exhausted', { label, attempt });
                    throw err;
                }
                const delay = this.computeBackoff(attempt);
                this.logger.warn('retry:backoff', { label, attempt, delayMs: delay });
                await sleep(delay);
            }
        }
    }

    protected computeBackoff(attempt: number): number {
        if (this.retry.backoff === 'fixed') return this.retry.baseDelayMs;
        const exp = this.retry.baseDelayMs * 2 ** (attempt - 1);
        return Math.min(exp, this.retry.maxDelayMs);
    }

    public getState(): ConnectionState {
        return this.state;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
