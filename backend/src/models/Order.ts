// ===============================================
// 📦 Order Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IOrderItem {
    productId?: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    price: number;
    taxRate?: number;
}

export interface IOrderTimelineEvent {
    type: string;
    at: Date;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface IOrder extends Document {
    company: mongoose.Types.ObjectId; // Reference to Company
    createdBy: mongoose.Types.ObjectId; // Reference to User
    items: IOrderItem[];
    totalAmount: number;
    subtotal?: number;
    taxTotal?: number;
    status: 'pending' | 'approved' | 'shipped' | 'completed' | 'cancelled';
    notes?: string;
    timeline: IOrderTimelineEvent[];
    createdAt: Date;
    updatedAt: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OrderSchema = new Schema<IOrder>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                productName: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true, min: 0 },
                taxRate: { type: Number, min: 0, max: 100 },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        subtotal: { type: Number, min: 0 },
        taxTotal: { type: Number, min: 0 },
        status: {
            type: String,
            enum: ['pending', 'approved', 'shipped', 'completed', 'cancelled'],
            default: 'pending',
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        timeline: [{
            type: { type: String, required: true },
            at: { type: Date, default: Date.now },
            actorId: { type: String },
            meta: { type: Schema.Types.Mixed },
        }],
    },
    {
        timestamps: true,
    }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
