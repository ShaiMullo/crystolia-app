// ===============================================
// 📬 Leads Router - CRM Enhanced
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import Lead from '../models/Lead.js';
import { sendTextMessage, normalizePhoneNumber } from '../services/whatsappService.js';
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
// POST /api/leads - Create or update lead (upsert)
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
        if (req.cookies?.auth_token) token = req.cookies.auth_token;
        else if (req.headers.authorization?.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwtSecret) as any;
                const user = await User.findById(decoded.id);
                if (user && (user.role === 'agent' || user.role === 'customer')) {
                    return res.status(403).json({ success: false, message: "Forbidden" });
                }
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

        // ━━━ Normalize phone BEFORE lookup ━━━
        const normalizedPhone = normalizePhoneNumber(phone);

        // ━━━ CRM Upsert Logic ━━━
        let lead = await Lead.findOne({ phone: normalizedPhone, isDeleted: false });

        const timestamp = new Date();
        const newMessage = {
            content: message || '',
            source: source || 'website',
            createdAt: timestamp,
        };

        if (lead) {
            // ══════ UPDATE EXISTING LEAD ══════
            console.log(`🔄 Updating existing lead: ${lead._id} (contact #${lead.contactCount + 1})`);

            // Increment contact count
            lead.contactCount = (lead.contactCount || 1) + 1;

            // Append message
            if (message) {
                lead.messages.push(newMessage);
            }

            // Timeline event
            lead.timeline.push({
                type: 'lead_updated',
                at: timestamp,
                meta: { source: source || 'website', contactCount: lead.contactCount },
            });

            // Re-engagement logic
            if (lead.status === 'closed' || lead.status === 'archived') {
                const oldStatus = lead.status;
                lead.status = 're-engaged';
                lead.timeline.push({
                    type: 'status_changed',
                    at: timestamp,
                    meta: { from: oldStatus, to: 're-engaged', reason: 'inbound_recontact' },
                });
            }

            // Update metadata
            lead.lastContactAt = timestamp;
            if (name) lead.name = name;
            if (email) lead.email = email;
            if (source) lead.source = source;

            await lead.save();

        } else {
            // ══════ CREATE NEW LEAD ══════
            console.log(`✨ Creating new lead for phone: ${normalizedPhone}`);

            lead = await Lead.create({
                name,
                phone: normalizedPhone,
                email,
                message: message || '',
                source: source || 'website',
                tags: tags || [],
                status: 'new',
                contactCount: 1,
                messages: message ? [newMessage] : [],
                timeline: [{
                    type: 'lead_created',
                    at: timestamp,
                    meta: { source: source || 'website' },
                }],
                notes: [],
                lastContactAt: timestamp,
                isDeleted: false,
            });

            // Audit Log (Only for creation)
            if (req.user) {
                await logAudit({
                    action: 'CREATE',
                    entity: 'Lead',
                    entityId: lead._id.toString(),
                    req,
                    details: { source: 'manual_entry' },
                });
            }
        }

        console.log(`📬 Lead processed: ${name} - ${normalizedPhone} (status=${lead.status}, count=${lead.contactCount})`);

        // ━━━ WhatsApp Notification (Fire-and-forget) ━━━
        try {
            if (!config.adminPhone) {
                console.warn('⚠️ [WhatsApp] ADMIN_PHONE_NUMBER is not set. Notification skipped.');
            } else {
                const waMessage = `🌻 Lead Update (${lead.status})
Name: ${name}
Phone: ${phone}
Message: ${message || 'N/A'}
Source: ${source || 'N/A'}
Count: ${lead.contactCount}
Status: ${lead.status}`;

                sendTextMessage(config.adminPhone, waMessage)
                    .then(() => {
                        // Add timeline event for WhatsApp notification
                        Lead.findByIdAndUpdate(lead!._id, {
                            $push: { timeline: { type: 'whatsapp_notified', at: new Date(), meta: { to: 'admin' } } }
                        }).catch(() => { /* silent */ });
                    })
                    .catch((err: Error) => console.warn('⚠️ [WhatsApp] Background send failed:', err.message));
            }
        } catch (waError) {
            console.warn('⚠️ [WhatsApp] Logic crash (should not happen):', waError);
        }

        // Return same shape as before for backward compatibility
        res.status(201).json({
            success: true,
            message: 'Lead received successfully',
            lead: lead,
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

        const query: Record<string, unknown> = { _id: req.params.id, isDeleted: false };

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

        const updateData: Record<string, unknown> = {
            ...(status && { status }),
            ...(notes !== undefined && { notes }),
            ...(tags !== undefined && { tags }),
        };

        if (req.user?.role === 'admin') {
            if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
            if (isDeleted !== undefined) {
                updateData.isDeleted = isDeleted;
                updateData.deletedAt = isDeleted ? new Date() : null;
            }
        }

        const query: Record<string, unknown> = { _id: req.params.id, isDeleted: false };
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
