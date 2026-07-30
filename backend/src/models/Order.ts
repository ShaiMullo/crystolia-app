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
    /** True while stock is reserved for this order. Deliberately has NO
     *  schema default: legacy orders stay undefined and their reservation
     *  state is inferred from the previous status (see orderStatusService). */
    inventoryReserved?: boolean;
    /** Client-generated idempotency key for order placement. Unique per
     *  creator (partial index) so a double-submit returns the first order. */
    clientRequestId?: string;
    /** Short-lived claim used to serialize status transitions: two
     *  concurrent PATCHes can both read the same status, but only one can
     *  atomically claim this lock (see orderStatusService). Stale locks
     *  (crashed process) expire after a TTL. */
    statusLockAt?: Date;
    /** Double-submit guard for the admin "retry notification" action —
     *  claimed atomically, expires after a short window. */
    notificationRetryAt?: Date;
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
        inventoryReserved: {
            type: Boolean,
        },
        statusLockAt: {
            type: Date,
        },
        notificationRetryAt: {
            type: Date,
        },
        clientRequestId: {
            type: String,
            trim: true,
            minlength: 8,
            maxlength: 64,
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

// Duplicate-submission guard: the same creator may never hold two orders
// with the same clientRequestId. Partial so legacy orders (no key) are
// unaffected and the field stays optional.
OrderSchema.index(
    { createdBy: 1, clientRequestId: 1 },
    { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string' } } },
);

// Additive ERP-sync metadata (optional fields; no index — see syncableFields.ts)
withSyncableFields(OrderSchema);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
