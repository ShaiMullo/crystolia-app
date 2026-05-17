// ===============================================
// 💳 CRM Payments Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { postPayment, voidPayment } from '../services/paymentService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const METHODS = new Set(['cash', 'bank_transfer', 'credit_card', 'check', 'other']);

// ━━ GET /api/crm/payments - list (filter by invoice / company)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 25);

        const filter: Record<string, unknown> = {};
        if (typeof req.query.invoiceId === 'string' && validate.objectId(req.query.invoiceId)) {
            filter.invoice = req.query.invoiceId;
        }
        if (typeof req.query.companyId === 'string' && validate.objectId(req.query.companyId)) {
            filter.company = req.query.companyId;
        }
        if (req.query.status === 'posted' || req.query.status === 'voided') {
            filter.status = req.query.status;
        }

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .sort({ paidAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('invoice', 'invoiceNumber totalAmount')
                .populate('company', 'name')
                .populate('createdBy', 'name email')
                .lean(),
            Payment.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/payments - post a payment
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        if (!body.invoiceId || !validate.objectId(body.invoiceId)) {
            throw new AppError('A valid invoiceId is required', 400);
        }
        const amount = Number(body.amount);
        if (!amount || amount <= 0) throw new AppError('amount must be a positive number', 400);
        if (body.method && !METHODS.has(body.method)) throw new AppError('Invalid payment method', 400);

        let result;
        try {
            result = await postPayment({
                invoiceId: body.invoiceId,
                amount,
                method: body.method,
                externalRef: typeof body.externalRef === 'string' ? body.externalRef.trim() : undefined,
                notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
                paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
                actorId: req.user?._id?.toString(),
            });
        } catch (e) {
            const msg = (e as Error).message;
            if (msg === 'Invoice not found') throw new AppError(msg, 404);
            throw e;
        }

        await logAudit({
            action: 'CREATE',
            entity: 'Payment',
            entityId: result.paymentId,
            req,
            details: { invoiceId: body.invoiceId, amount, paymentStatus: result.paymentStatus },
        });

        // Fire automation: payment received.
        const invoice = await Invoice.findById(body.invoiceId).select('invoiceNumber company').lean();
        await dispatchAutomation({
            event: 'payment.received',
            payload: {
                invoiceId: body.invoiceId,
                invoiceNumber: invoice?.invoiceNumber,
                amount,
                paymentStatus: result.paymentStatus,
                actorId: req.user?._id?.toString(),
            },
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/payments/:id/void - void a payment
router.post('/:id/void', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Payment ID', 400);
        let result;
        try {
            result = await voidPayment(req.params.id);
        } catch (e) {
            const msg = (e as Error).message;
            if (msg === 'Payment not found') throw new AppError(msg, 404);
            if (msg === 'Payment is already voided') throw new AppError(msg, 409);
            throw e;
        }
        await logAudit({ action: 'UPDATE', entity: 'Payment', entityId: req.params.id, req, details: { voided: true } });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

export default router;
