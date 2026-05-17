// ===============================================
// 🏃 Job Runner
// ===============================================
// Executes a single registered job, records telemetry on the
// ScheduledJob row, and appends a JobRun history entry. A job that
// is already running is skipped (no overlap).

import ScheduledJob from '../models/ScheduledJob.js';
import JobRun from '../models/JobRun.js';
import { opsLogger } from '../utils/opsLogger.js';

const log = opsLogger.forService('scheduler');

/** A job handler returns an optional summary object stored on the run. */
export type JobHandler = () => Promise<Record<string, unknown> | void>;

// In-process guard so a slow job never overlaps itself.
const runningKeys = new Set<string>();

export interface RunResult {
    ok: boolean;
    skipped?: boolean;
    durationMs?: number;
    error?: string;
    summary?: Record<string, unknown>;
}

export async function runJob(
    key: string,
    handler: JobHandler,
    trigger: 'scheduled' | 'manual' = 'scheduled',
): Promise<RunResult> {
    if (runningKeys.has(key)) {
        log.warn('job skipped — already running', { jobKey: key });
        return { ok: false, skipped: true };
    }

    runningKeys.add(key);
    const startedAt = new Date();

    try {
        await ScheduledJob.updateOne({ key }, { $set: { lastStatus: 'running' } });
        const summary = (await handler()) || undefined;
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        await ScheduledJob.updateOne(
            { key },
            {
                $set: { lastStatus: 'success', lastRunAt: finishedAt, lastDurationMs: durationMs, lastError: null },
                $inc: { runCount: 1 },
            },
        );
        await JobRun.create({ jobKey: key, status: 'success', startedAt, finishedAt, durationMs, summary, trigger });
        log.info('job succeeded', { jobKey: key, durationMs });
        return { ok: true, durationMs, summary };
    } catch (err) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const message = err instanceof Error ? err.message : String(err);

        await ScheduledJob.updateOne(
            { key },
            {
                $set: { lastStatus: 'failed', lastRunAt: finishedAt, lastDurationMs: durationMs, lastError: message },
                $inc: { runCount: 1, failureCount: 1 },
            },
        ).catch(() => undefined);
        await JobRun.create({ jobKey: key, status: 'failed', startedAt, finishedAt, durationMs, error: message, trigger })
            .catch(() => undefined);
        log.error('job failed', { jobKey: key, durationMs, error: message });
        return { ok: false, durationMs, error: message };
    } finally {
        runningKeys.delete(key);
    }
}

export function isJobRunning(key: string): boolean {
    return runningKeys.has(key);
}
