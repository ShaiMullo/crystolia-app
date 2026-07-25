// ===============================================
// 📦 Order Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';
import { withSyncableFields, type ISyncable } from './shared/syncableFields.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IOrderItem {
    productId?: mongoose.Types.ObjectId;
    sku?: string;
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

export interface IOrder extends Document, ISyncable {
    company: mongoose.Types.ObjectId; // Reference to Company
    createdBy: mongoose.Types.ObjectId; // Reference to User
    items: IOrderItem[];
    totalAmount: number;
    subtotal?: number;
    taxTotal?: number;
    status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'completed' | 'cancelled';
    /** How the customer intends to pay. Optional: orders placed before the
     *  payment-preference feature have none and keep loading unchanged. */
    paymentPreference?: 'bank_transfer' | 'credit_card';
    rejectionReason?: string;
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
                sku: { type: String, trim: true, maxlength: 80 },
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
            enum: ['pending', 'approved', 'rejected', 'shipped', 'completed', 'cancelled'],
            default: 'pending',
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        paymentPreference: {
            type: String,
            enum: ['bank_transfer', 'credit_card'],
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 1000,
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

// Additive ERP-sync metadata (optional fields; no index — see syncableFields.ts)
withSyncableFields(OrderSchema);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
