// ===============================================
// 🧾 Invoices Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Company from '../models/Company.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { issueInvoice } from '../services/greenInvoiceService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';

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

        await logAudit({
            action: 'CREATE',
            entity: 'Invoice',
            entityId: newInvoice._id.toString(),
            req,
            details: { invoiceNumber, totalAmount, status: status || 'draft' },
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

        await logAudit({
            action: 'UPDATE',
            entity: 'Invoice',
            entityId: req.params.id,
            req,
            details: req.body,
        });

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/invoices/:id/issue (Admin/Agent Only)
// Issues a draft invoice via Green Invoice → stores pdfUrl + greenInvoiceDocId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/:id/issue', authorize('admin', 'agent'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return next(new AppError('Invoice not found', 404));
        }

        if (invoice.status !== 'draft') {
            return next(new AppError(`Invoice is already ${invoice.status} — only draft invoices can be issued`, 400));
        }

        // Load company for Green Invoice client data
        const company = await Company.findById(invoice.company).lean();
        if (!company) {
            return next(new AppError('Company not found for this invoice', 404));
        }

        // Capture issue date before service call so the PDF and the record share the same timestamp
        const issueDate = new Date();

        const { pdfUrl, greenInvoiceDocId } = await issueInvoice({
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            issuedAt: issueDate,
            dueDate: invoice.dueDate,
            notes: invoice.notes,
            client: {
                name: company.name,
                email: company.email || company.billingEmail,
                phone: company.phone,
                address: company.address || company.billingAddress,
                city: company.city,
                vatNumber: company.vatNumber,
            },
        });

        invoice.pdfUrl = pdfUrl;
        invoice.greenInvoiceDocId = greenInvoiceDocId;
        invoice.status = 'issued';
        invoice.issuedAt = issueDate;
        await invoice.save();

        await logAudit({
            action: 'UPDATE',
            entity: 'Invoice',
            entityId: invoice._id.toString(),
            req,
            details: { issued: true, pdfUrl, greenInvoiceDocId },
        });

        await dispatchAutomation({
            event: 'invoice.issued',
            payload: {
                invoiceId: invoice._id.toString(),
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                companyId: invoice.company?.toString(),
                companyName: company.name,
                actorId: req.user?._id?.toString(),
            },
        });

        res.status(200).json({
            success: true,
            data: invoice,
            pdfUrl,
        });
    } catch (error: any) {
        // Surface Green Invoice API errors clearly
        if (error.response?.data) {
            console.error('❌ Green Invoice API error:', error.response.data);
            return next(new AppError(`Green Invoice error: ${error.response.data.description || error.message}`, 502));
        }
        next(error);
    }
});

export default router;
