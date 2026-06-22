// ===============================================
// 🔁 SyncHistory Model (generic, vendor-agnostic)
// ===============================================
// One row per completed sync run, summarising its outcome. Mirrors the shape of
// the integration layer's SyncResult so the future DB-backed SyncLog sink can
// persist directly into it.
//
// Additive & inert: not written to by any runtime code yet.

import mongoose, { Document, Schema } from 'mongoose';

export type SyncRunStatus = 'success' | 'partial' | 'error';
export type SyncRunMode = 'full' | 'incremental' | 'manual' | 'scheduled';
export type SyncRunDirection = 'pull' | 'push' | 'bidirectional';

export interface ISyncHistory extends Document {
    provider: string;             // e.g. 'comax'
    entity: string;               // 'products' | 'customers' | …
    mode: SyncRunMode;
    direction: SyncRunDirection;
    status: SyncRunStatus;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    deadLettered: number;
    dryRun: boolean;
    errorSummary?: string;
    correlationId?: string;
    createdAt: Date;
}

const SyncHistorySchema = new Schema<ISyncHistory>(
    {
        provider: { type: String, required: true, trim: true, index: true },
        entity: { type: String, required: true, trim: true, index: true },
        mode: {
            type: String,
            enum: ['full', 'incremental', 'manual', 'scheduled'],
            default: 'manual',
        },
        direction: {
            type: String,
            enum: ['pull', 'push', 'bidirectional'],
            default: 'pull',
        },
        status: {
            type: String,
            enum: ['success', 'partial', 'error'],
            default: 'success',
            index: true,
        },
        startedAt: { type: Date, required: true },
        finishedAt: { type: Date },
        durationMs: { type: Number, min: 0 },
        processed: { type: Number, default: 0, min: 0 },
        created: { type: Number, default: 0, min: 0 },
        updated: { type: Number, default: 0, min: 0 },
        skipped: { type: Number, default: 0, min: 0 },
        failed: { type: Number, default: 0, min: 0 },
        deadLettered: { type: Number, default: 0, min: 0 },
        dryRun: { type: Boolean, default: false },
        errorSummary: { type: String, trim: true, maxlength: 4000 },
        correlationId: { type: String, trim: true, index: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

SyncHistorySchema.index({ provider: 1, entity: 1, createdAt: -1 });

export const SyncHistory = mongoose.model<ISyncHistory>('SyncHistory', SyncHistorySchema);
export default SyncHistory;
