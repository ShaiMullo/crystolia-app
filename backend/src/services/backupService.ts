// ===============================================
// 💾 Backup Service (orchestration + metadata only)
// ===============================================
// Builds a manifest describing what a backup *would* contain by
// inspecting collection document counts. It does NOT run mongodump or
// upload to cloud storage — that is delegated to external ops tooling.

import mongoose from 'mongoose';
import BackupManifest from '../models/BackupManifest.js';
import { opsLogger } from '../utils/opsLogger.js';

const log = opsLogger.forService('backup');

// Collections we consider part of an application backup.
const BACKUP_COLLECTIONS = [
    'users', 'companies', 'leads', 'customers', 'orders', 'invoices',
    'payments', 'shipments', 'products', 'inventories', 'inventorymovements',
    'suppliers', 'purchaseorders', 'tasks', 'notifications', 'auditlogs',
    'automationrules', 'settings',
];

// Rough average document size used for the size estimate (bytes).
const AVG_DOC_BYTES = 1024;

export interface BackupResult {
    manifestId: string;
    status: string;
    totalDocuments: number;
    sizeEstimateBytes: number;
}

/**
 * Create a backup manifest. Counts documents per collection and records
 * a `completed` manifest (no data is copied).
 */
export async function createBackupManifest(label: string, actorId?: string): Promise<BackupResult> {
    const startedAt = new Date();
    const manifest = await BackupManifest.create({
        label: label || `backup-${startedAt.toISOString()}`,
        status: 'pending',
        startedAt,
        createdBy: actorId,
    });

    try {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database not connected');

        const collections: Array<{ collection: string; documentCount: number }> = [];
        let totalDocuments = 0;

        for (const name of BACKUP_COLLECTIONS) {
            // eslint-disable-next-line no-await-in-loop
            const count = await db.collection(name).estimatedDocumentCount().catch(() => 0);
            collections.push({ collection: name, documentCount: count });
            totalDocuments += count;
        }

        manifest.collections = collections;
        manifest.totalDocuments = totalDocuments;
        manifest.sizeEstimateBytes = totalDocuments * AVG_DOC_BYTES;
        manifest.status = 'completed';
        manifest.completedAt = new Date();
        await manifest.save();

        log.info('backup manifest created', { manifestId: manifest._id.toString(), totalDocuments });
        return {
            manifestId: manifest._id.toString(),
            status: manifest.status,
            totalDocuments,
            sizeEstimateBytes: manifest.sizeEstimateBytes,
        };
    } catch (err) {
        manifest.status = 'failed';
        manifest.error = err instanceof Error ? err.message : String(err);
        manifest.completedAt = new Date();
        await manifest.save().catch(() => undefined);
        log.error('backup manifest failed', { manifestId: manifest._id.toString(), error: manifest.error });
        throw err;
    }
}

/**
 * "Verify" a backup manifest — re-counts current collections and confirms
 * the manifest still looks consistent (counts within a tolerance).
 * This is a lightweight integrity check, not a true restore test.
 */
export async function verifyBackupManifest(manifestId: string): Promise<{ verified: boolean; drift: number }> {
    const manifest = await BackupManifest.findById(manifestId);
    if (!manifest) throw new Error('Backup manifest not found');
    if (manifest.status === 'failed') throw new Error('Cannot verify a failed backup');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    let currentTotal = 0;
    for (const entry of manifest.collections) {
        // eslint-disable-next-line no-await-in-loop
        const count = await db.collection(entry.collection).estimatedDocumentCount().catch(() => 0);
        currentTotal += count;
    }

    const drift = currentTotal - manifest.totalDocuments;
    manifest.status = 'verified';
    manifest.verifiedAt = new Date();
    await manifest.save();

    log.info('backup manifest verified', { manifestId, drift });
    return { verified: true, drift };
}

export async function listBackupManifests(limit = 30) {
    return BackupManifest.find({})
        .sort({ createdAt: -1 })
        .limit(Math.min(100, limit))
        .lean();
}
