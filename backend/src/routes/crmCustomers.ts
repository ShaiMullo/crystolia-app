// ===============================================
// 👥 CRM Customers Routes
// ===============================================
// Admin-only customer management. Mounted at /api/crm/customers to keep
// the existing /api/customers self-service router (my-profile, etc) intact.

import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Lead from '../models/Lead.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

// Sanitize and normalize a company body subset coming from the admin UI.
interface CompanyPayload {
    name?: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
}

function pickCompanyPayload(body: Record<string, unknown>): CompanyPayload {
    const out: CompanyPayload = {};
    if (typeof body.companyName === 'string' && body.companyName.trim()) out.name = body.companyName.trim();
    if (typeof body.vatNumber === 'string') out.vatNumber = body.vatNumber.trim() || undefined;
    if (typeof body.address === 'string') out.address = body.address.trim() || undefined;
    if (typeof body.city === 'string') out.city = body.city.trim() || undefined;
    if (typeof body.phone === 'string') out.phone = body.phone.trim() || undefined;
    if (typeof body.email === 'string') out.email = body.email.trim().toLowerCase() || undefined;
    return out;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/customers - Filtered, paginated list
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

        const filter: Record<string, unknown> = { isDeleted: false };
        if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
        if (typeof req.query.assignedTo === 'string' && req.query.assignedTo) {
            if (validate.objectId(req.query.assignedTo)) filter.assignedTo = req.query.assignedTo;
        }
        if (typeof req.query.tags === 'string' && req.query.tags) {
            filter.tags = { $in: req.query.tags.split(',').map(s => s.trim()).filter(Boolean) };
        }

        // Search: company name OR contact name / phone / email. Company name lives
        // on the referenced Company doc, so we do a lookup-then-match for the search case.
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            // Find matching companies by name first
            const matchingCompanies = await Company.find({ name: rx }).select('_id').lean();
            const companyIds = matchingCompanies.map((c) => c._id);
            filter.$or = [
                { contactName: rx },
                { contactEmail: rx },
                { contactPhone: rx },
                ...(companyIds.length > 0 ? [{ company: { $in: companyIds } }] : []),
            ];
        }

        const [customers, total] = await Promise.all([
            Customer.find(filter)
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('company', 'name vatNumber email phone city')
                .populate('assignedTo', 'name email role')
                .lean(),
            Customer.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: customers,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/customers/:id - Detail incl. linked orders/invoices
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Customer ID', 400);
        }
        const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false })
            .populate('company', 'name vatNumber email phone city address')
            .populate('assignedTo', 'name email role')
            .populate('createdBy', 'name email')
            .lean();
        if (!customer) {
            throw new AppError('Customer not found', 404);
        }

        const companyId = (customer.company as { _id?: mongoose.Types.ObjectId })?._id;

        const [orders, invoices, sourceLead] = await Promise.all([
            companyId
                ? Order.find({ company: companyId }).sort({ createdAt: -1 }).lean()
                : Promise.resolve([]),
            companyId
                ? Invoice.find({ company: companyId }).sort({ issuedAt: -1 }).lean()
                : Promise.resolve([]),
            customer.sourceLeadId
                ? Lead.findById(customer.sourceLeadId).select('name phone email status convertedAt').lean()
                : Promise.resolve(null),
        ]);

        res.json({
            success: true,
            data: {
                ...customer,
                orders,
                invoices,
                sourceLead,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/crm/customers - Create
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        const companyPayload = pickCompanyPayload(body);

        if (!companyPayload.name) {
            throw new AppError('companyName is required', 400);
        }

        // Find-or-create Company (dedupe by VAT first, then by name).
        let company = companyPayload.vatNumber
            ? await Company.findOne({ vatNumber: companyPayload.vatNumber })
            : null;
        if (!company) company = await Company.findOne({ name: companyPayload.name });
        if (!company) {
            company = await Company.create({ ...companyPayload, isActive: true });
        }

        // Customer.company is unique — dedupe.
        const existing = await Customer.findOne({ company: company._id, isDeleted: false });
        if (existing) {
            return res.status(200).json({ success: true, idempotent: true, data: existing.toObject() });
        }

        const customer = await Customer.create({
            company: company._id,
            contactName: typeof body.contactName === 'string' && body.contactName.trim() ? body.contactName.trim() : undefined,
            contactEmail: companyPayload.email,
            contactPhone: companyPayload.phone,
            assignedTo: typeof body.assignedTo === 'string' && validate.objectId(body.assignedTo) ? body.assignedTo : undefined,
            status: typeof body.status === 'string' ? body.status : 'active',
            tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [],
            createdBy: req.user?._id,
            lastContactAt: new Date(),
            timeline: [{ type: 'customer_created', at: new Date(), actorId: req.user?._id?.toString() }],
        });

        await logAudit({
            action: 'CREATE',
            entity: 'Customer',
            entityId: customer._id.toString(),
            req,
            details: { companyId: company._id.toString(), companyName: company.name },
        });

        const populated = await customer.populate([
            { path: 'company', select: 'name vatNumber email phone city' },
            { path: 'assignedTo', select: 'name email role' },
        ]);

        res.status(201).json({ success: true, data: populated.toObject() });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/customers/:id - Update
// Allows updating CRM fields and (optionally) the linked Company fields.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Customer ID', 400);
        }
        const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
        if (!customer) {
            throw new AppError('Customer not found', 404);
        }

        const body = req.body || {};
        const now = new Date();
        const actorId = req.user?._id?.toString();
        const meta: Record<string, unknown> = {};
        const before: Record<string, unknown> = {};

        // ── CRM fields ──
        if (typeof body.contactName === 'string') {
            before.contactName = customer.contactName;
            customer.contactName = body.contactName.trim() || undefined;
            meta.contactName = customer.contactName;
        }
        if (typeof body.contactEmail === 'string') {
            const next = body.contactEmail.trim().toLowerCase() || undefined;
            if (next && !validate.email(next)) throw new AppError('Invalid contact email', 400);
            customer.contactEmail = next;
            meta.contactEmail = next;
        }
        if (typeof body.contactPhone === 'string') {
            customer.contactPhone = body.contactPhone.trim() || undefined;
            meta.contactPhone = customer.contactPhone;
        }
        if (typeof body.status === 'string') {
            if (!['active', 'inactive', 'on-hold', 'archived'].includes(body.status)) {
                throw new AppError('Invalid status', 400);
            }
            if (body.status !== customer.status) {
                customer.timeline.push({ type: 'status_changed', at: now, actorId, meta: { from: customer.status, to: body.status } });
            }
            customer.status = body.status as typeof customer.status;
        }
        if (Array.isArray(body.tags)) {
            customer.tags = body.tags.filter((t: unknown) => typeof t === 'string');
        }
        if (typeof body.assignedTo === 'string') {
            const next = body.assignedTo.trim();
            if (next && !validate.objectId(next)) throw new AppError('Invalid assignedTo', 400);
            const prev = customer.assignedTo?.toString();
            customer.assignedTo = next ? (new mongoose.Types.ObjectId(next) as typeof customer.assignedTo) : undefined;
            if (prev !== next) {
                customer.timeline.push({ type: 'agent_assigned', at: now, actorId, meta: { from: prev || null, to: next || null } });
            }
        }
        if (typeof body.note === 'string' && body.note.trim()) {
            customer.notes.push({ text: body.note.trim(), createdAt: now, actorId });
            customer.timeline.push({ type: 'note_added', at: now, actorId });
        }

        // ── Optional Company-level updates ──
        const companyPayload = pickCompanyPayload(body);
        if (Object.keys(companyPayload).length > 0) {
            await Company.findByIdAndUpdate(customer.company, companyPayload, { runValidators: true });
        }

        customer.timeline.push({ type: 'customer_updated', at: now, actorId, meta });
        await customer.save();

        await logAudit({
            action: 'UPDATE',
            entity: 'Customer',
            entityId: customer._id.toString(),
            req,
            details: { changes: meta, companyChanges: companyPayload, before },
        });

        const populated = await customer.populate([
            { path: 'company', select: 'name vatNumber email phone city address' },
            { path: 'assignedTo', select: 'name email role' },
        ]);
        res.json({ success: true, data: populated.toObject() });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/crm/customers/:id - Soft delete
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Customer ID', 400);
        }
        const customer = await Customer.findOne({ _id: req.params.id, isDeleted: false });
        if (!customer) {
            throw new AppError('Customer not found', 404);
        }
        customer.isDeleted = true;
        customer.deletedAt = new Date();
        await customer.save();

        await logAudit({
            action: 'DELETE',
            entity: 'Customer',
            entityId: customer._id.toString(),
            req,
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
