// ===============================================
// 🧾 JobRun Model — per-execution history
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

export interface IJobRun extends Document {
    jobKey: string;
    status: 'success' | 'failed';
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    error?: string;
    summary?: Record<string, unknown>;
    trigger: 'scheduled' | 'manual';
    createdAt: Date;
    updatedAt: Date;
}

const JobRunSchema = new Schema<IJobRun>(
    {
        jobKey: { type: String, required: true, index: true },
        status: { type: String, enum: ['success', 'failed'], required: true },
        startedAt: { type: Date, required: true },
        finishedAt: { type: Date, required: true },
        durationMs: { type: Number, required: true },
        error: { type: String },
        summary: { type: Schema.Types.Mixed },
        trigger: { type: String, enum: ['scheduled', 'manual'], default: 'scheduled' },
    },
    { timestamps: true },
);

JobRunSchema.index({ jobKey: 1, createdAt: -1 });

export const JobRun = mongoose.model<IJobRun>('JobRun', JobRunSchema);
export default JobRun;
