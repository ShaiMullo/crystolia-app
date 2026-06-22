// ===============================================
// 🏭 Supplier Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';
import { withSyncableFields, type ISyncable } from './shared/syncableFields.js';

export interface ISupplierNote {
    text: string;
    createdAt: Date;
    actorId?: string;
}

export interface ISupplier extends Document, ISyncable {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
    notes: ISupplierNote[];
    isActive: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
    {
        name: { type: String, required: true, trim: true, maxlength: 200, index: true },
        contactName: { type: String, trim: true, maxlength: 120 },
        email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format'] },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        vatNumber: { type: String, trim: true },
        notes: [{
            text: { type: String, required: true, maxlength: 4000 },
            createdAt: { type: Date, default: Date.now },
            actorId: { type: String },
        }],
        isActive: { type: Boolean, default: true, index: true },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

SupplierSchema.index({ name: 'text' });

// Additive ERP-sync metadata (optional fields; no index — see syncableFields.ts)
withSyncableFields(SupplierSchema);

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
export default Supplier;
