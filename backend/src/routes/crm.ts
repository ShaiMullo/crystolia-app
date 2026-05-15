// ===============================================
// 📊 CRM API Routes
// ===============================================
// Additive CRM endpoints — does NOT replace /api/leads
// All routes are protected and admin-only

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Lead, { LeadStatus } from '../models/Lead.js';
import Company from '../models/Company.js';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';

const router = Router();

// Strong-ish placeholder password used when admin converts a lead without
// supplying one. Always includes an uppercase letter and a digit so it
// passes the User schema validator.
function generateTempPassword(): string {
    const raw = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '');
    return `A${raw}9`;
}

// All CRM routes require admin auth
router.use(protect);
router.use(authorize('admin'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/leads - Filtered CRM lead list
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/leads', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const query: Record<string, unknown> = { isDeleted: false };

        // Filters
        if (req.query.status) query.status = req.query.status;
        if (req.query.ownerId) query.ownerId = req.query.ownerId;
        if (req.query.source) query.source = req.query.source;
        if (req.query.tags) query.tags = { $in: (req.query.tags as string).split(',') };

        // Date range
        if (req.query.from || req.query.to) {
            const dateFilter: Record<string, Date> = {};
            if (req.query.from) dateFilter.$gte = new Date(req.query.from as string);
            if (req.query.to) dateFilter.$lte = new Date(req.query.to as string);
            query.createdAt = dateFilter;
        }

        // Search
        if (req.query.search) {
            query.$text = { $search: req.query.search as string };
        }

        // Sort
        const sortField = (req.query.sortBy as string) || 'lastContactAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const [leads, total] = await Promise.all([
            Lead.find(query)
                .sort({ [sortField]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Lead.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                leads,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/crm/leads/:id - Full lead detail
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/leads/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/status - Change status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { status } = req.body;
        const validStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'converted', 'closed', 'archived', 're-engaged'];

        if (!status || !validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Valid: ${validStatuses.join(', ')}`, 400);
        }

        const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false });
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        const oldStatus = lead.status;
        lead.status = status;
        lead.timeline.push({
            type: 'status_changed',
            at: new Date(),
            actorId: req.user?._id?.toString(),
            meta: { from: oldStatus, to: status },
        });

        await lead.save();

        // Audit
        if (req.user) {
            await logAudit({
                action: 'UPDATE',
                entity: 'Lead',
                entityId: lead._id.toString(),
                req,
                details: { statusChange: { from: oldStatus, to: status } },
            });
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/crm/leads/:id/notes - Add note
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/leads/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new AppError('Note text is required', 400);
        }

        const now = new Date();
        const actorId = req.user?._id?.toString();

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $push: {
                    notes: { text: text.trim(), createdAt: now, actorId },
                    timeline: { type: 'note_added', at: now, actorId, meta: { preview: text.trim().substring(0, 50) } },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/assign - Assign owner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { ownerId } = req.body;
        // ownerId can be a userId string or empty to unassign

        const now = new Date();
        const actorId = req.user?._id?.toString();

        const updateData: Record<string, unknown> = {
            ownerId: ownerId || null,
            assignedTo: ownerId || null,
        };

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $set: updateData,
                $push: {
                    timeline: {
                        type: 'owner_assigned',
                        at: now,
                        actorId,
                        meta: { ownerId: ownerId || 'unassigned' },
                    },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/crm/leads/:id/convert
// Convert a lead into a Company (+ optional customer User).
// Idempotent: re-calling on an already-converted lead returns the
// existing company/user without mutating state.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/leads/:id/convert', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            throw new AppError('Lead not found', 404);
        }
        if (lead.isDeleted) {
            throw new AppError('Cannot convert a deleted lead', 400);
        }

        // ── Idempotency: already converted ──
        if (lead.convertedToCompanyId) {
            const [existingCompany, existingUser, existingCustomer] = await Promise.all([
                Company.findById(lead.convertedToCompanyId).lean(),
                lead.convertedToUserId
                    ? User.findById(lead.convertedToUserId).select('-password').lean()
                    : Promise.resolve(null),
                lead.customerId
                    ? Customer.findById(lead.customerId).lean()
                    : Customer.findOne({ company: lead.convertedToCompanyId, isDeleted: false }).lean(),
            ]);
            return res.status(200).json({
                success: true,
                idempotent: true,
                lead: lead.toObject(),
                company: existingCompany,
                user: existingUser,
                customer: existingCustomer,
            });
        }

        const { companyName, vatNumber, address, city, phone, email, userName, password, note } = req.body || {};

        // ── Resolve company name (required, fallback to lead.name) ──
        const resolvedCompanyName = (companyName?.trim?.()) || lead.name?.trim();
        if (!resolvedCompanyName) {
            throw new AppError('companyName is required (lead has no name to fall back to)', 400);
        }

        // ── Resolve email (optional; from body or lead) ──
        const normalizedEmail =
            (email?.trim?.().toLowerCase()) ||
            (lead.email?.trim?.().toLowerCase()) ||
            undefined;
        if (normalizedEmail && !validate.email(normalizedEmail)) {
            throw new AppError('Invalid email format', 400);
        }

        // ── Find or create Company (dedupe by VAT, then by name) ──
        const trimmedVat = vatNumber?.trim?.();
        let company = trimmedVat ? await Company.findOne({ vatNumber: trimmedVat }) : null;
        if (!company) {
            company = await Company.findOne({ name: resolvedCompanyName });
        }

        let companyCreated = false;
        if (!company) {
            try {
                company = await Company.create({
                    name: resolvedCompanyName,
                    ...(trimmedVat && { vatNumber: trimmedVat }),
                    ...(address?.trim?.() && { address: address.trim() }),
                    ...(city?.trim?.() && { city: city.trim() }),
                    ...((phone?.trim?.() || lead.phone) && { phone: (phone?.trim?.() || lead.phone) }),
                    ...(normalizedEmail && { email: normalizedEmail }),
                    isActive: true,
                });
                companyCreated = true;
            } catch (err: unknown) {
                if ((err as { code?: number }).code === 11000) {
                    throw new AppError('Duplicate company (name or VAT number already exists)', 409);
                }
                throw err;
            }
        }

        // ── Optionally find or create customer User ──
        let user: InstanceType<typeof User> | null = null;
        let userCreated = false;
        let tempPassword: string | undefined;

        if (normalizedEmail) {
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                if (existingUser.role !== 'customer') {
                    throw new AppError(
                        `Email ${normalizedEmail} already belongs to a ${existingUser.role}; cannot link to lead`,
                        409
                    );
                }
                if (existingUser.company && existingUser.company.toString() !== company._id.toString()) {
                    throw new AppError(
                        `User ${normalizedEmail} is already linked to a different company`,
                        409
                    );
                }
                if (!existingUser.company) {
                    existingUser.company = company._id;
                    existingUser.isCompanyOwner = companyCreated;
                    await existingUser.save({ validateBeforeSave: false });
                }
                user = existingUser;
            } else {
                const finalName = userName?.trim?.() || lead.name?.trim() || normalizedEmail.split('@')[0];
                const finalPassword = password?.trim?.() || generateTempPassword();
                if (!password?.trim?.()) tempPassword = finalPassword;

                try {
                    user = await User.create({
                        name: finalName,
                        email: normalizedEmail,
                        password: finalPassword,
                        role: 'customer',
                        company: company._id,
                        isCompanyOwner: companyCreated,
                        isActive: true,
                    });
                    userCreated = true;
                } catch (err: unknown) {
                    if ((err as { code?: number }).code === 11000) {
                        throw new AppError('User email already exists (race condition)', 409);
                    }
                    throw err;
                }
            }
        }

        // ── Update lead ──
        const now = new Date();
        const actorId = req.user?._id?.toString();

        // ── Find or create CRM Customer record (dedupe by company) ──
        let customer = await Customer.findOne({ company: company._id, isDeleted: false });
        let customerCreated = false;
        if (!customer) {
            customer = await Customer.create({
                company: company._id,
                contactName: userName?.trim?.() || lead.name?.trim() || undefined,
                contactEmail: normalizedEmail,
                contactPhone: phone?.trim?.() || lead.phone || undefined,
                sourceLeadId: lead._id,
                createdBy: req.user?._id,
                lastContactAt: now,
                tags: lead.tags || [],
                timeline: [{
                    type: 'customer_created',
                    at: now,
                    actorId,
                    meta: { source: 'lead_conversion', leadId: lead._id.toString() },
                }],
            });
            customerCreated = true;
        } else if (!customer.sourceLeadId) {
            // Backfill source lead reference if we converted twice from different leads
            customer.sourceLeadId = lead._id;
            customer.lastContactAt = now;
            customer.timeline.push({
                type: 'customer_linked',
                at: now,
                actorId,
                meta: { leadId: lead._id.toString() },
            });
            await customer.save();
        }

        lead.status = 'converted';
        lead.convertedToCompanyId = company._id;
        if (user) lead.convertedToUserId = user._id;
        lead.customerId = customer._id;
        lead.convertedAt = now;

        lead.timeline.push({
            type: 'converted',
            at: now,
            actorId,
            meta: {
                companyId: company._id.toString(),
                companyCreated,
                customerId: customer._id.toString(),
                customerCreated,
                ...(user && { userId: user._id.toString(), userCreated }),
            },
        });

        if (note?.trim?.()) {
            const trimmedNote = note.trim();
            lead.notes.push({ text: trimmedNote, createdAt: now, actorId });
            lead.timeline.push({
                type: 'note_added',
                at: now,
                actorId,
                meta: { source: 'conversion', preview: trimmedNote.substring(0, 50) },
            });
        }

        await lead.save();

        // ── Audit ──
        await logAudit({
            action: 'UPDATE',
            entity: 'Lead',
            entityId: lead._id.toString(),
            req,
            details: {
                action: 'convert',
                companyId: company._id.toString(),
                companyCreated,
                customerId: customer._id.toString(),
                customerCreated,
                userId: user?._id?.toString(),
                userCreated,
            },
        });

        if (customerCreated) {
            await logAudit({
                action: 'CREATE',
                entity: 'Customer',
                entityId: customer._id.toString(),
                req,
                details: { source: 'lead_conversion', leadId: lead._id.toString() },
            });
        }

        // Strip password from user response
        let userResponse: Record<string, unknown> | null = null;
        if (user) {
            const obj = user.toObject() as unknown as Record<string, unknown>;
            delete obj.password;
            userResponse = obj;
        }

        // Fire automation: lead.converted
        await dispatchAutomation({
            event: 'lead.converted',
            payload: {
                leadId: lead._id.toString(),
                leadName: lead.name,
                customerId: customer._id.toString(),
                customerName: resolvedCompanyName,
                companyId: company._id.toString(),
                assignedTo: lead.assignedTo || lead.ownerId,
                actorId: req.user?._id?.toString(),
            },
        });

        res.status(201).json({
            success: true,
            idempotent: false,
            lead: lead.toObject(),
            company: company.toObject(),
            customer: customer.toObject(),
            user: userResponse,
            ...(tempPassword && { tempPassword }),
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/crm/leads/:id/onboarding - Update onboarding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/leads/:id/onboarding', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { currentStep, completed, data } = req.body;

        const updateFields: Record<string, unknown> = {};
        if (currentStep !== undefined) updateFields['onboarding.currentStep'] = currentStep;
        if (completed !== undefined) {
            updateFields['onboarding.completed'] = completed;
            if (completed) updateFields['onboarding.completedAt'] = new Date();
        }
        if (data) {
            // Merge data into existing onboarding.data
            for (const [key, value] of Object.entries(data)) {
                updateFields[`onboarding.data.${key}`] = value;
            }
        }

        const now = new Date();

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            {
                $set: updateFields,
                $push: {
                    timeline: {
                        type: 'onboarding_step_completed',
                        at: now,
                        meta: { step: currentStep, completed: !!completed },
                    },
                },
            },
            { new: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({ success: true, lead });
    } catch (error) {
        next(error);
    }
});

export default router;
