// ===============================================
// 🔁 SyncEngine — generic sync orchestrator
// ===============================================
// Coordinates a sync run for a given connector + entity, independent of which
// ERP is behind the connector. Provides the *seams* the brief asks for:
//   • Full / Incremental / Manual / Scheduled modes (via SyncContext.mode)
//   • Queue-ready  → SyncQueue interface (+ in-memory default stub)
//   • Dead-letter-ready → DeadLetterSink interface (+ in-memory default stub)
//   • Retry        → delegated to the connector's RetryPolicy
//   • Logging/metrics → SyncLogSink + opsLogger
//
// IMPORTANT: this module is architecture only. It is not imported by the running
// server, registers no jobs, and performs no database writes. Invoking it would
// call connector methods that currently throw "not implemented".

import { opsLogger } from '../../utils/opsLogger.js';
import type { IERPConnector } from './IERPConnector.js';
import { defaultSyncLogSink, type SyncLogSink } from './SyncLog.js';
import type { SyncContext, SyncEntity, SyncResult } from './syncTypes.js';

const log = opsLogger.forService('erp:sync-engine');

// ---- Queue seam (swap the in-memory stub for BullMQ/SQS later) ----

export interface SyncJob {
    provider: string;
    entity: SyncEntity;
    context: SyncContext;
    enqueuedAt: Date;
    attempts: number;
}

export interface SyncQueue {
    enqueue(job: SyncJob): Promise<void>;
    dequeue(): Promise<SyncJob | undefined>;
    size(): number;
}

/** Minimal in-process FIFO. Placeholder for a real broker — not for production load. */
export class InMemorySyncQueue implements SyncQueue {
    private readonly items: SyncJob[] = [];
    public async enqueue(job: SyncJob): Promise<void> {
        this.items.push(job);
    }
    public async dequeue(): Promise<SyncJob | undefined> {
        return this.items.shift();
    }
    public size(): number {
        return this.items.length;
    }
}

// ---- Dead-letter seam ----

export interface DeadLetterEntry {
    job: SyncJob;
    error: string;
    failedAt: Date;
}

export interface DeadLetterSink {
    capture(entry: DeadLetterEntry): Promise<void>;
    list(): Promise<DeadLetterEntry[]>;
}

export class InMemoryDeadLetterSink implements DeadLetterSink {
    private readonly entries: DeadLetterEntry[] = [];
    public async capture(entry: DeadLetterEntry): Promise<void> {
        this.entries.push(entry);
    }
    public async list(): Promise<DeadLetterEntry[]> {
        return [...this.entries];
    }
}

// ---- Engine ----

export interface SyncEngineDeps {
    logSink?: SyncLogSink;
    queue?: SyncQueue;
    deadLetters?: DeadLetterSink;
}

const ENTITY_DISPATCH: Record<SyncEntity, keyof IERPConnector> = {
    products: 'syncProducts',
    customers: 'syncCustomers',
    inventory: 'syncInventory',
    orders: 'syncOrders',
    invoices: 'syncInvoices',
    suppliers: 'syncSuppliers',
    priceLists: 'syncPriceLists',
    warehouses: 'syncWarehouses',
};

export class SyncEngine {
    private readonly logSink: SyncLogSink;
    private readonly queue: SyncQueue;
    private readonly deadLetters: DeadLetterSink;

    constructor(deps: SyncEngineDeps = {}) {
        this.logSink = deps.logSink ?? defaultSyncLogSink;
        this.queue = deps.queue ?? new InMemorySyncQueue();
        this.deadLetters = deps.deadLetters ?? new InMemoryDeadLetterSink();
    }

    /** Schedule a sync for later draining (scheduled/manual flows). */
    public async enqueue(
        connector: IERPConnector,
        entity: SyncEntity,
        context: SyncContext,
    ): Promise<void> {
        await this.queue.enqueue({
            provider: connector.provider,
            entity,
            context,
            enqueuedAt: new Date(),
            attempts: 0,
        });
        log.info('enqueued', { provider: connector.provider, entity, mode: context.mode });
    }

    /**
     * Run a single entity sync immediately against a connector. On failure the
     * job is routed to the dead-letter sink. Returns the SyncResult (or null if
     * it dead-lettered before producing one).
     */
    public async runOnce(
        connector: IERPConnector,
        entity: SyncEntity,
        context: SyncContext,
    ): Promise<SyncResult | null> {
        const method = ENTITY_DISPATCH[entity];
        try {
            const result = await (connector[method] as (c: SyncContext) => Promise<SyncResult>)(
                context,
            );
            await this.logSink.recordResult(result);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await this.deadLetters.capture({
                job: {
                    provider: connector.provider,
                    entity,
                    context,
                    enqueuedAt: new Date(),
                    attempts: context ? 1 : 0,
                },
                error: message,
                failedAt: new Date(),
            });
            await this.logSink.recordEvent({
                provider: connector.provider,
                level: 'error',
                message: `sync failed and was dead-lettered: ${message}`,
                context: { entity },
                at: new Date(),
            });
            return null;
        }
    }

    /** Drain the queue, running each job once. Architecture-only helper. */
    public async drain(connector: IERPConnector): Promise<void> {
        let job = await this.queue.dequeue();
        while (job) {
            await this.runOnce(connector, job.entity, job.context);
            job = await this.queue.dequeue();
        }
    }

    public getDeadLetterSink(): DeadLetterSink {
        return this.deadLetters;
    }
}
