// ===============================================
// 🧾 ReconciliationLog Model
// ===============================================
// One row per reconciliation run — a durable history beyond audit logs.

import mongoose, { Document, Schema } from 'mongoose';

export interface IReconciliationLog extends Document {
    ranBy?: mongoose.Types.ObjectId;
    autoFix: boolean;
    scannedOrders: number;
    scannedInventoryRows: number;
    reservationDriftCount: number;
    negativeStockCount: number;
    invoicePaymentMismatchCount: number;
    impossibleStateCount: number;
    healthScore: number;
    severity: 'healthy' | 'warning' | 'critical';
    fixed: boolean;
    summary?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const ReconciliationLogSchema = new Schema<IReconciliationLog>(
    {
        ranBy: { type: Schema.Types.ObjectId, ref: 'User' },
        autoFix: { type: Boolean, default: false },
        scannedOrders: { type: Number, default: 0 },
        scannedInventoryRows: { type: Number, default: 0 },
        reservationDriftCount: { type: Number, default: 0 },
        negativeStockCount: { type: Number, default: 0 },
        invoicePaymentMismatchCount: { type: Number, default: 0 },
        impossibleStateCount: { type: Number, default: 0 },
        healthScore: { type: Number, default: 100 },
        severity: { type: String, enum: ['healthy', 'warning', 'critical'], default: 'healthy' },
        fixed: { type: Boolean, default: false },
        summary: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
);

export const ReconciliationLog = mongoose.model<IReconciliationLog>('ReconciliationLog', ReconciliationLogSchema);
export default ReconciliationLog;
