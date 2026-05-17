// ===============================================
// 📥 PurchaseOrder Model
// ===============================================
// Supplier replenishment. Receiving stock against a PO increments
// Inventory via the inventory service.

import mongoose, { Document, Schema } from 'mongoose';

export type PurchaseOrderStatus =
    | 'draft'
    | 'ordered'
    | 'partially_received'
    | 'received'
    | 'cancelled';

export interface IPurchaseOrderItem {
    product: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;          // ordered quantity
    receivedQuantity: number;  // cumulative received
    unitCost: number;
}

export interface IPurchaseOrderTimelineEvent {
    type: string;
    at: Date;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface IPurchaseOrder extends Document {
    poNumber: string;
    supplier: mongoose.Types.ObjectId;
    status: PurchaseOrderStatus;
    items: IPurchaseOrderItem[];
    totalCost: number;
    notes?: string;
    expectedAt?: Date;
    orderedAt?: Date;
    receivedAt?: Date;
    timeline: IPurchaseOrderTimelineEvent[];
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        poNumber: { type: String, required: true, unique: true, trim: true, index: true },
        supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
        status: {
            type: String,
            enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'],
            default: 'draft',
            index: true,
        },
        items: [{
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            productName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            receivedQuantity: { type: Number, default: 0, min: 0 },
            unitCost: { type: Number, required: true, min: 0 },
        }],
        totalCost: { type: Number, default: 0, min: 0 },
        notes: { type: String, trim: true, maxlength: 1000 },
        expectedAt: { type: Date },
        orderedAt: { type: Date },
        receivedAt: { type: Date },
        timeline: [{
            type: { type: String, required: true },
            at: { type: Date, default: Date.now },
            actorId: { type: String },
            meta: { type: Schema.Types.Mixed },
        }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrder;
