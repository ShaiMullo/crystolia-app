// ===============================================
// 📬 Leads Router - Enhanced
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import Lead from '../models/Lead.js';
import { sendTextMessage } from '../services/whatsappService.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, AppError } from '../utils/validation.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛑 Apply Rate Limiting
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const createLeadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 lead creations per hour
    message: 'Too many leads created from this IP, please try again later.'
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/leads - Create new lead
// 🔓 Public (Website) or Admin
// 🛑 Blocked: Agent, Customer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/', createLeadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // OPTIONAL SECURITY Check:
        // If a user *is* logged in, ensure they are allowed to post.
        // We allow Public (no token) and Admin.
        // We BLOCK Agent and Customer.
        let token;
        if (req.cookies?.token) token = req.cookies.token;
        else if (req.headers.authorization?.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwtSecret) as any;
                const user = await User.findById(decoded.id);
                if (user && (user.role === 'agent' || user.role === 'customer')) {
                    return res.status(403).json({ success: false, message: "Forbidden" });
                }
                // If Admin, proceed.
                // If user not found (deleted), treat as public? Or fail? 
                // Let's assume valid token means identified user. 
                if (user) req.user = user;

            } catch (err) {
                // Invalid token -> Treat as Public (allow)
            }
        }

        const { name, phone, email, message, source, tags } = req.body;

        // Validation
        if (!name || !phone) {
            throw new AppError('Name and phone are required', 400);
        }

        if (email && !validate.email(email)) {
            throw new AppError('Invalid email format', 400);
        }

        // Create lead in MongoDB
        const newLead = await Lead.create({
            name,
            phone,
            email,
            message: message || '',
            source: source || 'website',
            tags: tags || [],
            status: 'new',
            isDeleted: false,
        });

        // Audit Log (Only if authenticated aka Admin)
        if (req.user) {
            await logAudit({
                action: 'CREATE',
                entity: 'Lead',
                entityId: newLead._id.toString(),
                req,
                details: { source: 'manual_entry' }
            });
        }

        console.log(`📬 New lead received: ${name} - ${phone}`);

        // 🔔 Notify Admin via WhatsApp (Fire-and-forget)
        try {
            if (!config.adminPhone) {
                console.warn('⚠️ WhatsApp Warning: ADMIN_PHONE_NUMBER is not set. Notification skipped.');
            } else {
                sendTextMessage(config.adminPhone, `🚀 New Lead: ${name}\n📱 ${phone}\n💬 ${message || 'No message'}`)
                    .then(result => {
                        if (!result.success) console.warn('⚠️ WhatsApp Warning: Failed to send message:', result.error);
                    })
                    .catch(err => console.warn('⚠️ WhatsApp Warning: Unexpected transport error:', err.message));
            }
        } catch (waError) {
            console.warn('⚠️ WhatsApp Warning: logic crash:', waError);
        }

        res.status(201).json({
            success: true,
            message: 'Lead received successfully',
            lead: newLead,
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/leads - Get all leads (Filtered & Sorted)
// 🔒 Protected: Admin & Agent (Filtered)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Block Customer
        if (req.user?.role === 'customer') {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        // Filtering
        const { status, source, search, assigneedTo } = req.query;
        const query: Record<string, unknown> = {
            isDeleted: false
        };

        if (status) query.status = status;
        if (source) query.source = source;

        // 2. Agent Filtering
        if (req.user?.role === 'agent') {
            query.assignedTo = req.user._id;
        } else if (assigneedTo) {
            // Admin can filter by assignee
            query.assignedTo = assigneedTo;
        }

        // Search (Text Index)
        if (search) {
            query.$text = { $search: search as string };
        }

        // Execute with pagination
        const [leads, total] = await Promise.all([
            Lead.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Lead.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                leads,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/leads/:id - Get single lead
// 🔒 Protected: Admin & Agent (Filtered)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Block Customer
        if (req.user?.role === 'customer') {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const query: any = { _id: req.params.id, isDeleted: false };

        // 2. Agent Filtering
        if (req.user?.role === 'agent') {
            query.assignedTo = req.user._id;
        }

        const lead = await Lead.findOne(query).lean();

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        res.json({
            success: true,
            lead,
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/leads/:id - Update lead
// 🔒 Protected: Admin & Agent (Filtered)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Block Customer
        if (req.user?.role === 'customer') {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const { status, notes, assignedTo, tags, isDeleted } = req.body;

        // Allow soft delete via patch - ADMIN ONLY? User didn't specify. Assuming patch rules apply.
        // Update data construction
        const updateData: any = {
            ...(status && { status }),
            ...(notes !== undefined && { notes }),
            ...(tags !== undefined && { tags }),
            // assignedTo: Agents cannot reassign leads? Usually only Admin.
            // Requirement says "agent -> can edit ONLY leads assigned to them".
            // It doesn't say they can't change assignment. But typically they shouldn't.
            // Let's restrict reassignment to Admin for safety, unless specified.
            // For now, I'll allow it if they own it, but practically Agents don't reassign.
        };

        if (req.user?.role === 'admin') {
            if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
            if (isDeleted !== undefined) {
                updateData.isDeleted = isDeleted;
                updateData.deletedAt = isDeleted ? new Date() : null;
            }
        }

        const query: any = { _id: req.params.id, isDeleted: false };
        // 2. Agent Filtering
        if (req.user?.role === 'agent') {
            query.assignedTo = req.user._id;
        }

        const lead = await Lead.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!lead) {
            throw new AppError('Lead not found or access denied', 404);
        }

        // Audit Log
        if (req.user) {
            await logAudit({
                action: 'UPDATE',
                entity: 'Lead',
                entityId: lead._id.toString(),
                req,
                details: updateData
            });
        }

        res.json({
            success: true,
            lead,
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE /api/leads/:id - Soft Delete
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) {
            throw new AppError('Invalid Lead ID', 400);
        }

        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        );

        if (!lead) {
            throw new AppError('Lead not found', 404);
        }

        // Audit Log
        if (req.user) {
            await logAudit({
                action: 'DELETE',
                entity: 'Lead',
                entityId: lead._id.toString(),
                req,
                details: { softDelete: true }
            });
        }

        res.json({
            success: true,
            message: 'Lead archived successfully',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
