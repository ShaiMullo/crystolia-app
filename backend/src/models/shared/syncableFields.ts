// ===============================================
// 🔗 Syncable fields — shared, reusable schema fragment
// ===============================================
// Additive sync metadata applied to models that participate in ERP
// synchronisation (Comax or any future ERP). Every field is OPTIONAL — no new
// required field, no rename, no removal, no change to existing validation.
//
// Existing documents simply lack these paths and read back as `undefined`
// (with `syncStatus` resolving to its default 'never' on load). Nothing is
// written or migrated by adding this fragment.
//
// NOTE: intentionally NO index is declared here. A sparse compound index on
// (externalSource, externalId) is RECOMMENDED for lookups during real sync, but
// is deferred so it can be reviewed/approved separately (auto-index builds can
// run on startup in production). See the checkpoint report.

import { Schema, type SchemaDefinition } from 'mongoose';

/** Mirrors the SyncStatus used by the integration layer (syncTypes.ts). */
export type SyncStatus = 'never' | 'pending' | 'synced' | 'error';

/** Mixin interface — spread into a model's Document interface via `extends`. */
export interface ISyncable {
    /** Primary id of this record in the external ERP. */
    externalId?: string;
    /** Which ERP this record is linked to, e.g. 'comax'. */
    externalSource?: string;
    /** When the ERP last modified the record (if it exposes that). */
    externalUpdatedAt?: Date;
    /** When Crystolia last reconciled this record with the ERP. */
    lastSyncedAt?: Date;
    /** Current sync state for this record. */
    syncStatus?: SyncStatus;
    /** Last sync error message, if any. */
    syncError?: string;
    /** Untouched last-seen ERP payload, kept for audit/debugging only. */
    rawExternalData?: unknown;
}

/** The raw schema path definitions — also exported for direct spreading. */
export const syncableFields = {
    externalId: { type: String, trim: true },
    externalSource: { type: String, trim: true },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date },
    syncStatus: {
        type: String,
        enum: ['never', 'pending', 'synced', 'error'],
        default: 'never',
    },
    syncError: { type: String, trim: true },
    rawExternalData: { type: Schema.Types.Mixed },
} as const;

/**
 * Apply the syncable fields to an existing schema. Use after the schema's own
 * fields/indexes are declared and before `mongoose.model(...)` is called.
 *
 * Implemented via `schema.add(...)` so it is purely additive and does not depend
 * on the schema's generic type parameter.
 */
export function withSyncableFields(schema: Schema): void {
    schema.add(syncableFields as unknown as SchemaDefinition);
}
