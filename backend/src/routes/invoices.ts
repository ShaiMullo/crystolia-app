// ===============================================
// 🧾 Invoices Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import { AppError } from '../utils/validation.js';

const router = Router();

// Protect ALL routes
router.use(protect);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/invoices
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        let query: any = {};

        // RBAC Logic
        if (user.role === 'customer') {
            // Customer -> Only their company
            // Accessing populated company ID safely
            const companyId = user.company?._id || user.company; // Handle both populated and unpopulated cases

            if (!companyId) return next(new AppError('No company linked', 403));
            query = { company: companyId };
        } else {
            // Admin/Agent -> All invoices
            // Optional: Filter by company if provided in query
            if (req.query.companyId) {
                query = { company: req.query.companyId };
            }
        }

        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .populate('company', 'name')
            .populate('order', 'totalAmount status');

        res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/invoices (Admin/Agent Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', authorize('admin', 'agent'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { company, order, invoiceNumber, totalAmount, status, notes, dueDate } = req.body;

        if (!company || !invoiceNumber || totalAmount === undefined) {
            return next(new AppError('Company, invoiceNumber, and totalAmount are required', 400));
        }

        const newInvoice = await Invoice.create({
            company,
            order,
            invoiceNumber,
            totalAmount,
            status: status || 'draft',
            notes,
            dueDate,
            issuedAt: new Date()
        });

        res.status(201).json({
            success: true,
            data: newInvoice
        });
    } catch (error) {
        // Handle duplicate invoice number
        if ((error as any).code === 11000) {
            return next(new AppError('Invoice number already exists', 400));
        }
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/invoices/:id (Admin/Agent Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', authorize('admin', 'agent'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allowedUpdates = ['status', 'notes', 'dueDate', 'totalAmount'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return next(new AppError('Invalid updates!', 400));
        }

        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return next(new AppError('Invoice not found', 404));
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        next(error);
    }
});

export default router;
