// ===============================================
// ⏰ Scheduler — lightweight in-process cron
// ===============================================
// No Redis, no queues. A single setInterval ticks every minute and
// runs any enabled job whose interval has elapsed since lastRunAt.

import ScheduledJob from '../models/ScheduledJob.js';
import { JOB_HANDLERS } from './handlers.js';
import { runJob, isJobRunning } from './jobRunner.js';
import { opsLogger } from '../utils/opsLogger.js';

const log = opsLogger.forService('scheduler');
const TICK_MS = 60_000;
const HOUR = 3_600_000;

interface JobDefinition {
    key: string;
    name: string;
    description: string;
    intervalMs: number;
}

// Registry — the canonical list of seeded jobs.
const JOB_DEFINITIONS: JobDefinition[] = [
    {
        key: 'nightly_reconciliation',
        name: 'Nightly inventory reconciliation',
        description: 'Recomputes reservations, detects drift and inconsistencies, auto-fixes.',
        intervalMs: 24 * HOUR,
    },
    {
        key: 'overdue_invoice_reminders',
        name: 'Overdue invoice reminders',
        description: 'Notifies admins about invoices past their due date.',
        intervalMs: 24 * HOUR,
    },
    {
        key: 'low_stock_digest',
        name: 'Low-stock digest',
        description: 'Summarises products below their minimum threshold.',
        intervalMs: 12 * HOUR,
    },
    {
        key: 'stale_leads_reminder',
        name: 'Stale leads reminder',
        description: 'Flags open leads with no recent contact.',
        intervalMs: 24 * HOUR,
    },
    {
        key: 'unpaid_invoices_escalation',
        name: 'Unpaid invoices escalation',
        description: 'Escalates invoices unpaid for 30+ days.',
        intervalMs: 24 * HOUR,
    },
];

let tickHandle: NodeJS.Timeout | null = null;

/** Upsert job rows on boot — preserves admin-edited enabled/intervalMs. */
export async function seedScheduledJobs(): Promise<void> {
    for (const def of JOB_DEFINITIONS) {
        // eslint-disable-next-line no-await-in-loop
        await ScheduledJob.updateOne(
            { key: def.key },
            {
                $setOnInsert: {
                    key: def.key,
                    name: def.name,
                    description: def.description,
                    enabled: true,
                    intervalMs: def.intervalMs,
                    lastStatus: 'idle',
                    runCount: 0,
                    failureCount: 0,
                },
            },
            { upsert: true },
        );
    }
}

async function tick(): Promise<void> {
    const now = Date.now();
    let jobs;
    try {
        jobs = await ScheduledJob.find({ enabled: true }).lean();
    } catch (err) {
        log.error('scheduler tick failed to read jobs', { error: (err as Error).message });
        return;
    }

    for (const job of jobs) {
        const handler = JOB_HANDLERS[job.key];
        if (!handler) continue;
        if (isJobRunning(job.key)) continue;
        const lastRun = job.lastRunAt ? new Date(job.lastRunAt).getTime() : 0;
        if (now - lastRun < job.intervalMs) continue;
        // Fire-and-forget — runJob records its own telemetry.
        void runJob(job.key, handler, 'scheduled');
    }
}

export function startScheduler(): void {
    if (tickHandle) return;
    log.info('scheduler started', { tickMs: TICK_MS, jobs: JOB_DEFINITIONS.length });
    tickHandle = setInterval(() => { void tick(); }, TICK_MS);
    // Allow the process to exit even if the timer is pending.
    tickHandle.unref?.();
}

export function stopScheduler(): void {
    if (tickHandle) {
        clearInterval(tickHandle);
        tickHandle = null;
    }
}

/** Run a job immediately (admin "run now" action). */
export async function runJobNow(key: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
    const handler = JOB_HANDLERS[key];
    if (!handler) return { ok: false, error: 'Unknown job' };
    const result = await runJob(key, handler, 'manual');
    return { ok: result.ok, error: result.error, skipped: result.skipped };
}

export { JOB_DEFINITIONS };
