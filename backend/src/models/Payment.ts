// ===============================================
// 💳 Payment Model
// ===============================================
// A payment posted against an invoice. Multiple payments per invoice
// are supported (partial payments). The invoice's amountPaid /
// paymentStatus are recomputed by paymentService after every change.

import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
export type PaymentStatus = 'posted' | 'voided';

export interface IPayment extends Document {
    invoice: mongoose.Types.ObjectId;
    company?: mongoose.Types.ObjectId;        // denormalized for customer payment history
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    externalRef?: string;
    notes?: string;
    paidAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
        company: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
        amount: { type: Number, required: true, min: 0 },
        method: {
            type: String,
            enum: ['cash', 'bank_transfer', 'credit_card', 'check', 'other'],
            default: 'bank_transfer',
        },
        status: {
            type: String,
            enum: ['posted', 'voided'],
            default: 'posted',
            index: true,
        },
        externalRef: { type: String, trim: true, maxlength: 120 },
        notes: { type: String, trim: true, maxlength: 1000 },
        paidAt: { type: Date, default: Date.now, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

PaymentSchema.index({ invoice: 1, status: 1 });
PaymentSchema.index({ company: 1, paidAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
export default Payment;
