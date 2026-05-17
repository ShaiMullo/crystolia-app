// ===============================================
// 💳 Payment Service
// ===============================================
// Posts payments and keeps the parent invoice's amountPaid /
// paymentStatus in sync. Payment posting is wrapped in an optional
// transaction so the Payment write and the Invoice update commit together.

import mongoose, { ClientSession } from 'mongoose';
import Payment, { PaymentMethod } from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { withTransaction } from '../db/withTransaction.js';

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Derive payment status from totals + due date. */
export function derivePaymentStatus(
    totalAmount: number,
    amountPaid: number,
    dueDate?: Date | null,
): 'unpaid' | 'partial' | 'paid' | 'overdue' {
    if (amountPaid >= totalAmount && totalAmount > 0) return 'paid';
    if (amountPaid >= totalAmount && totalAmount === 0) return 'paid';
    const overdue = !!dueDate && new Date(dueDate).getTime() < Date.now();
    if (amountPaid > 0) return overdue ? 'overdue' : 'partial';
    return overdue ? 'overdue' : 'unpaid';
}

/** Recompute and persist an invoice's payment fields from its posted payments. */
export async function recomputeInvoicePayment(
    invoiceId: string | mongoose.Types.ObjectId,
    session?: ClientSession,
): Promise<{ amountPaid: number; paymentStatus: string } | null> {
    const invoice = await Invoice.findById(invoiceId).session(session ?? null);
    if (!invoice) return null;

    const agg = await Payment.aggregate([
        { $match: { invoice: invoice._id, status: 'posted' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).session(session ?? null);

    const amountPaid = round2(agg[0]?.total || 0);
    const paymentStatus = derivePaymentStatus(invoice.totalAmount, amountPaid, invoice.dueDate);

    invoice.amountPaid = amountPaid;
    invoice.paymentStatus = paymentStatus;
    // Keep the legacy `status` consistent: a fully paid invoice becomes 'paid'.
    if (paymentStatus === 'paid' && invoice.status === 'issued') {
        invoice.status = 'paid';
    }
    await invoice.save({ session });
    return { amountPaid, paymentStatus };
}

export interface PostPaymentInput {
    invoiceId: string;
    amount: number;
    method?: PaymentMethod;
    externalRef?: string;
    notes?: string;
    paidAt?: Date;
    actorId?: string;
}

export interface PostPaymentResult {
    paymentId: string;
    amountPaid: number;
    paymentStatus: string;
    transactional: boolean;
}

/** Post a payment against an invoice (transaction-safe). */
export async function postPayment(input: PostPaymentInput): Promise<PostPaymentResult> {
    if (input.amount <= 0) throw new Error('Payment amount must be positive');

    const { result, transactional } = await withTransaction(async (session) => {
        const invoice = await Invoice.findById(input.invoiceId).session(session ?? null);
        if (!invoice) throw new Error('Invoice not found');

        const [payment] = await Payment.create(
            [{
                invoice: invoice._id,
                company: invoice.company,
                amount: round2(input.amount),
                method: input.method || 'bank_transfer',
                status: 'posted',
                externalRef: input.externalRef,
                notes: input.notes,
                paidAt: input.paidAt || new Date(),
                createdBy: input.actorId,
            }],
            { session },
        );

        const recomputed = await recomputeInvoicePayment(invoice._id, session);
        return {
            paymentId: payment._id.toString(),
            amountPaid: recomputed?.amountPaid ?? 0,
            paymentStatus: recomputed?.paymentStatus ?? 'unpaid',
        };
    });

    return { ...result, transactional };
}

/** Void a payment and recompute the invoice. */
export async function voidPayment(paymentId: string): Promise<PostPaymentResult> {
    const { result, transactional } = await withTransaction(async (session) => {
        const payment = await Payment.findById(paymentId).session(session ?? null);
        if (!payment) throw new Error('Payment not found');
        if (payment.status === 'voided') throw new Error('Payment is already voided');
        payment.status = 'voided';
        await payment.save({ session });

        const recomputed = await recomputeInvoicePayment(payment.invoice, session);
        return {
            paymentId: payment._id.toString(),
            amountPaid: recomputed?.amountPaid ?? 0,
            paymentStatus: recomputed?.paymentStatus ?? 'unpaid',
        };
    });
    return { ...result, transactional };
}
