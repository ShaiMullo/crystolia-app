// ===============================================
// 📊 Inventory Model
// ===============================================
// One row per (product, location). availableQuantity = quantity - reservedQuantity.

import mongoose, { Document, Schema } from 'mongoose';
import { withSyncableFields, type ISyncable } from './shared/syncableFields.js';

export interface IInventory extends Document, ISyncable {
    product: mongoose.Types.ObjectId;
    location: string;             // 'main' for now; future-proof for multi-warehouse
    quantity: number;             // on-hand
    reservedQuantity: number;     // soft-reserved (e.g. approved orders awaiting shipment)
    minimumQuantity: number;      // low-stock threshold
    lastMovementAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
    {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        location: { type: String, default: 'main', trim: true, maxlength: 80 },
        quantity: { type: Number, default: 0, min: 0 },
        reservedQuantity: { type: Number, default: 0, min: 0 },
        minimumQuantity: { type: Number, default: 0, min: 0 },
        lastMovementAt: { type: Date },
    },
    { timestamps: true },
);

InventorySchema.index({ product: 1, location: 1 }, { unique: true });

// Additive ERP-sync metadata (optional fields; no index — see syncableFields.ts)
withSyncableFields(InventorySchema);

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
export default Inventory;
