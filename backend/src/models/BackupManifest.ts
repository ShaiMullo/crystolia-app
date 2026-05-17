// ===============================================
// 💾 BackupManifest Model
// ===============================================
// Metadata-only backup record. Phase 8 builds the orchestration +
// manifest layer — actual mongodump/cloud upload is intentionally NOT
// executed here (a future ops integration owns that).

import mongoose, { Document, Schema } from 'mongoose';

export type BackupStatus = 'pending' | 'completed' | 'failed' | 'verified';

export interface IBackupCollectionEntry {
    collection: string;
    documentCount: number;
}

export interface IBackupManifest extends Document {
    label: string;
    status: BackupStatus;
    collections: IBackupCollectionEntry[];
    totalDocuments: number;
    sizeEstimateBytes: number;
    location?: string;          // logical target (e.g. 's3://bucket/key') — informational
    startedAt: Date;
    completedAt?: Date;
    verifiedAt?: Date;
    error?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BackupManifestSchema = new Schema<IBackupManifest>(
    {
        label: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'verified'],
            default: 'pending',
            index: true,
        },
        collections: [{
            collection: { type: String, required: true },
            documentCount: { type: Number, default: 0 },
        }],
        totalDocuments: { type: Number, default: 0 },
        sizeEstimateBytes: { type: Number, default: 0 },
        location: { type: String },
        startedAt: { type: Date, required: true },
        completedAt: { type: Date },
        verifiedAt: { type: Date },
        error: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

BackupManifestSchema.index({ createdAt: -1 });

export const BackupManifest = mongoose.model<IBackupManifest>('BackupManifest', BackupManifestSchema);
export default BackupManifest;
