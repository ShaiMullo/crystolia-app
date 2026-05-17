// ===============================================
// 🚚 Shipment Model
// ===============================================
// Tracks the physical fulfilment of an order. One order may have
// multiple shipments (partial fulfilment), though the UI defaults to one.

import mongoose, { Document, Schema } from 'mongoose';

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

export interface IShipmentTimelineEvent {
    type: string;
    at: Date;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface IShipment extends Document {
    order: mongoose.Types.ObjectId;
    company?: mongoose.Types.ObjectId;
    status: ShipmentStatus;
    courier?: string;
    trackingNumber?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    notes?: string;
    timeline: IShipmentTimelineEvent[];
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
    {
        order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        company: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
        status: {
            type: String,
            enum: ['pending', 'shipped', 'in_transit', 'delivered', 'cancelled'],
            default: 'pending',
            index: true,
        },
        courier: { type: String, trim: true, maxlength: 120 },
        trackingNumber: { type: String, trim: true, maxlength: 120 },
        shippedAt: { type: Date },
        deliveredAt: { type: Date },
        notes: { type: String, trim: true, maxlength: 1000 },
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

ShipmentSchema.index({ order: 1, createdAt: -1 });

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
export default Shipment;
