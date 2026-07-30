// ===============================================
// 🧾 Invoice Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';
import { withSyncableFields, type ISyncable } from './shared/syncableFields.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IInvoice extends Document, ISyncable {
    company: mongoose.Types.ObjectId; // Reference to Company
    order?: mongoose.Types.ObjectId; // Optional Reference to Order
    invoiceNumber: string;
    totalAmount: number;
    status: 'draft' | 'issued' | 'paid' | 'cancelled';
    issuedAt?: Date;
    dueDate?: Date;
    notes?: string;
    pdfUrl?: string;           // Set when issued via Green Invoice
    greenInvoiceDocId?: string; // Green Invoice document ID

    // Provider-agnostic metadata (additive — Green Invoice remains the only
    // implemented provider; Rivhit will plug in here without schema migrations).
    provider?: 'green_invoice' | 'rivhit' | 'manual';
    providerDocId?: string;
    externalRef?: string;

    // Payment tracking (additive — recomputed by paymentService).
    amountPaid: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue';

    createdAt: Date;
    updatedAt: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const InvoiceSchema = new Schema<IInvoice>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            index: true,
        },
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: false,
        },
        invoiceNumber: {
            type: String,
            required: [true, 'Invoice number is required'],
            unique: true,
            index: true,
            trim: true,
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: 0,
        },
        status: {
            type: String,
            enum: ['draft', 'issued', 'paid', 'cancelled'],
            default: 'draft',
            index: true,
        },
        issuedAt: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
        },
        notes: {
            type: String,
            trim: true,
        },
        pdfUrl: {
            type: String,
            trim: true,
        },
        greenInvoiceDocId: {
            type: String,
            trim: true,
        },
        provider: {
            type: String,
            enum: ['green_invoice', 'rivhit', 'manual'],
        },
        providerDocId: { type: String, trim: true, index: true },
        externalRef: { type: String, trim: true },
        amountPaid: { type: Number, default: 0, min: 0 },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'partial', 'paid', 'overdue'],
            default: 'unpaid',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Additive ERP-sync metadata (optional fields; no index — see syncableFields.ts)
// One auto-invoice per order, enforced at the database level so concurrent
// approvals cannot create duplicates. Partial: manual invoices without an
// order are unlimited. If legacy production data already contains
// duplicates, the index build fails harmlessly (Mongoose logs it) and the
// application-level duplicate handling remains the guard.
InvoiceSchema.index(
    { order: 1 },
    { unique: true, partialFilterExpression: { order: { $type: 'objectId' } } },
);

withSyncableFields(InvoiceSchema);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
