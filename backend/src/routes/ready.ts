// ===============================================
// ✅ Readiness handler — shared by src/index.ts and the test harness
// ===============================================
// Ready means "this deployment can safely run PRODUCTION order/inventory
// processing": database connected, MongoDB transactions available
// (replica set / mongos), and the unique Invoice.order index in place.
// /api/live remains the plain process-liveness endpoint; deploys and the
// compose healthcheck gate on THIS endpoint instead.

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { invoiceIndexReadiness } from '../db/indexReadiness.js';
import { transactionReadiness } from '../db/transactionReadiness.js';

export async function readyHandler(_req: Request, res: Response): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ ready: false, reason: 'Database not connected' });
        return;
    }
    const txn = await transactionReadiness();
    if (!txn.ready) {
        res.status(503).json({ ready: false, reason: txn.reason, topology: txn.topology });
        return;
    }
    const invoiceIndex = await invoiceIndexReadiness();
    if (!invoiceIndex.ready) {
        res.status(503).json({ ready: false, reason: invoiceIndex.reason, topology: txn.topology });
        return;
    }
    res.status(200).json({ ready: true, topology: txn.topology });
}
