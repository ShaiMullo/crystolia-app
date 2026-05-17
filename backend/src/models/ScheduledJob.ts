// ===============================================
// ⏰ ScheduledJob Model
// ===============================================
// One row per registered job. The scheduler reads `enabled` + `intervalMs`
// and stamps run telemetry back here. Job *logic* lives in code (jobs/);
// this row is the persisted control + telemetry surface.

import mongoose, { Document, Schema } from 'mongoose';

export type JobStatus = 'idle' | 'running' | 'success' | 'failed';

export interface IScheduledJob extends Document {
    key: string;                // stable identifier, matches a registered handler
    name: string;
    description?: string;
    enabled: boolean;
    intervalMs: number;         // how often to run
    lastRunAt?: Date;
    lastStatus: JobStatus;
    lastDurationMs?: number;
    lastError?: string;
    runCount: number;
    failureCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ScheduledJobSchema = new Schema<IScheduledJob>(
    {
        key: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        enabled: { type: Boolean, default: true, index: true },
        intervalMs: { type: Number, required: true, min: 60000 },
        lastRunAt: { type: Date },
        lastStatus: { type: String, enum: ['idle', 'running', 'success', 'failed'], default: 'idle' },
        lastDurationMs: { type: Number },
        lastError: { type: String },
        runCount: { type: Number, default: 0 },
        failureCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export const ScheduledJob = mongoose.model<IScheduledJob>('ScheduledJob', ScheduledJobSchema);
export default ScheduledJob;
