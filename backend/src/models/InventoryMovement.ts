// ===============================================
// 🔄 InventoryMovement Model (immutable log)
// ===============================================
// Append-only audit trail. Each row represents one stock change.

import mongoose, { Document, Schema } from 'mongoose';

export type MovementType = 'in' | 'out' | 'adjustment' | 'reserved' | 'released';

export interface IInventoryMovement extends Document {
    product: mongoose.Types.ObjectId;
    location: string;
    type: MovementType;
    quantity: number;             // always positive; sign is implied by `type`
    reason?: string;
    relatedOrder?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
    {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        location: { type: String, default: 'main', trim: true },
        type: {
            type: String,
            enum: ['in', 'out', 'adjustment', 'reserved', 'released'],
            required: true,
        },
        quantity: { type: Number, required: true, min: 0 },
        reason: { type: String, trim: true, maxlength: 400 },
        relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

InventoryMovementSchema.index({ product: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>(
    'InventoryMovement',
    InventoryMovementSchema,
);
export default InventoryMovement;
