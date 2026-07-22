// ===============================================
// 📬 Leads Router - CRM Enhanced
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import Lead from '../models/Lead.js';
import { sendTextMessage, normalizePhoneNumber } from '../services/whatsappService.js';
import { buildLeadNotificationSms, isSmsConfigured, sendSms } from '../services/smsService.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate, AppError } from '../utils/validation.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';
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
const createOrUpdateLead = async (req: Request, res: Response, next: NextFunction) => {
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

        // ━━━ Sanitize the public payload (whitelist + trim + cap) ━━━
        // Only these fields are ever read from the body; anything else —
        // including internal fields like status/ownerId/isDeleted — is ignored.
        const str = (v: unknown, max: number): string =>
            typeof v === 'string' ? v.trim().slice(0, max) : '';

        const name = str(req.body.name, 100);
        const companyName = str(req.body.companyName, 120);
        const phone = str(req.body.phone, 32);
        const email = str(req.body.email, 254);
        const message = str(req.body.message, 2000);
        // Public callers cannot label their own source — it is forced to
        // "website". Authenticated staff may still label manual entries.
        const source = req.user ? (str(req.body.source, 100) || 'website') : 'website';

        // Website attribution — validated/capped, never trusted raw.
        const VALID_LOCALES = ['en', 'he', 'ru'];
        const locale = VALID_LOCALES.includes(req.body.locale) ? (req.body.locale as string) : undefined;
        // The domain comes from the Origin header — which already passed the
        // csrf allow-list for this state-changing request — never from the
        // body. PUBLIC submissions only: a staff manual entry (or a staff
        // re-submit of an existing website lead) must not stamp the admin
        // origin over genuine website attribution.
        let sourceDomain: string | undefined;
        if (!req.user) {
            try {
                if (req.headers.origin) sourceDomain = new URL(req.headers.origin).hostname;
            } catch { /* unparseable Origin → no domain attribution */ }
        }
        // sourcePage must be a safe RELATIVE path — never a full/external URL,
        // never protocol-relative ("//evil"), and never backslash/whitespace
        // trickery ("/\\evil" — browsers treat \\ as / in URLs).
        const rawPage = str(req.body.sourcePage, 300);
        const sourcePage = /^\/(?!\/)[^\s\\]*$/.test(rawPage) ? rawPage : undefined;

        // Idempotency key: one per real submit attempt from the form. Repeats
        // of the same attempt (network retry, double-fire, duplicated request)
        // must not create a second lead or a second notification.
        const submissionId =
            typeof req.body.submissionId === 'string' && /^[0-9a-zA-Z-]{8,64}$/.test(req.body.submissionId)
                ? req.body.submissionId
                : undefined;
        const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
        let utm: Record<string, string> | undefined;
        if (req.body.utm && typeof req.body.utm === 'object') {
            for (const key of UTM_KEYS) {
                const value = str((req.body.utm as Record<string, unknown>)[key], 200);
                if (value) (utm ??= {})[key] = value;
            }
        }

        // Tags are an internal CRM concept — only an authenticated admin may set them.
        const tags = req.user && Array.isArray(req.body.tags)
            ? (req.body.tags as unknown[]).filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 50))
            : [];

        // ━━━ Honeypot: bots fill the hidden "website" field; humans never see it.
        // Pretend success without creating anything (don't tip the bot off).
        if (str(req.body.website, 200)) {
            return res.status(201).json({ success: true, message: 'Lead received successfully' });
        }

        // Validation
        if (!name || !phone || (!req.user && !email)) {
            throw new AppError(
                req.user ? 'Name and phone are required' : 'Name, phone, and email are required',
                400,
            );
        }

        if (email && !validate.email(email)) {
            throw new AppError('Invalid email format', 400);
        }

        // ━━━ Normalize phone BEFORE lookup ━━━
        const normalizedPhone = normalizePhoneNumber(phone);
        if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
            throw new AppError('Invalid phone number', 400);
        }

        // ━━━ Idempotent replay: this exact submission was already processed ━━━
        if (submissionId) {
            const processed = await Lead
                .findOne({ $or: [{ submissionId }, { lastSubmissionId: submissionId }] })
                .select('_id')
                .lean();
            if (processed) {
                return res.status(201).json({
                    success: true,
                    message: 'Lead received successfully',
                    leadId: processed._id,
                });
            }
        }

        // ━━━ CRM Upsert Logic ━━━
        let lead = await Lead.findOne({ phone: normalizedPhone, isDeleted: false });

        const timestamp = new Date();
        const newMessage = {
            content: message || '',
            source,
            createdAt: timestamp,
        };
        // Attribution captured in the timeline too, so it survives later edits.
        const attribution = {
            ...(locale && { locale }),
            ...(sourceDomain && { sourceDomain }),
            ...(sourcePage && { sourcePage }),
            ...(utm && { utm }),
        };

        if (lead) {
            // ══════ UPDATE EXISTING LEAD ══════
            // Atomically claim this submissionId: of two concurrent identical
            // requests only one matches the $ne filter; the loser replays the
            // success response instead of double-incrementing contactCount and
            // double-notifying. Single-document op → safe across instances.
            if (submissionId) {
                const claimed = await Lead.findOneAndUpdate(
                    { _id: lead._id, lastSubmissionId: { $ne: submissionId } },
                    { $set: { lastSubmissionId: submissionId } },
                ).select('_id').lean();
                if (!claimed) {
                    return res.status(201).json({
                        success: true,
                        message: 'Lead received successfully',
                        leadId: lead._id,
                    });
                }
            }
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
                meta: { source, contactCount: lead.contactCount, ...attribution },
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
            if (companyName) lead.companyName = companyName;
            if (email) lead.email = email;
            if (source) lead.source = source;
            if (locale) lead.locale = locale;
            if (sourceDomain) lead.sourceDomain = sourceDomain;
            if (sourcePage) lead.sourcePage = sourcePage;
            if (utm) lead.utm = utm;

            try {
                await lead.save();
            } catch (saveErr) {
                // The claim above already recorded this submissionId; if the
                // update itself failed, release the claim so an honest retry
                // of the same attempt re-applies instead of being replayed as
                // a success that never happened.
                if (submissionId) {
                    await Lead.updateOne(
                        { _id: lead._id, lastSubmissionId: submissionId },
                        { $unset: { lastSubmissionId: '' } },
                    ).catch(() => { /* best effort — worst case is a replayed retry */ });
                }
                throw saveErr;
            }

        } else {
            // ══════ CREATE NEW LEAD ══════
            try {
                lead = await Lead.create({
                    name,
                    companyName: companyName || undefined,
                    phone: normalizedPhone,
                    email: email || undefined,
                    message: message || '',
                    source,
                    ...attribution,
                    ...(submissionId && { submissionId, lastSubmissionId: submissionId }),
                    tags,
                    status: 'new',
                    contactCount: 1,
                    messages: message ? [newMessage] : [],
                    timeline: [{
                        type: 'lead_created',
                        at: timestamp,
                        meta: { source, ...attribution },
                    }],
                    notes: [],
                    lastContactAt: timestamp,
                    isDeleted: false,
                });
            } catch (createErr) {
                // A concurrent request with the same submissionId won the
                // unique-sparse index race — replay its success instead of
                // failing, and send no second notification.
                const isDup = (createErr as { code?: number })?.code === 11000;
                if (isDup && submissionId) {
                    const winner = await Lead.findOne({ submissionId }).select('_id').lean();
                    if (winner) {
                        return res.status(201).json({
                            success: true,
                            message: 'Lead received successfully',
                            leadId: winner._id,
                        });
                    }
                }
                throw createErr;
            }
            console.log(`✨ Created new lead: ${lead._id}`);

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

        // No PII in server logs — the lead id is enough to find the record.
        console.log(`📬 Lead processed: ${lead._id} (status=${lead.status}, count=${lead.contactCount}, source=${source})`);

        // ━━━ Administrator notifications (fire-and-forget) ━━━
        // Notification delivery must never delay or roll back lead storage.
        // A direct CRM link lets the administrator move from the alert to the
        // protected lead record without searching by phone or name.
        try {
            if (!config.adminPhone) {
                console.warn('[Notifications] ADMIN_PHONE_NUMBER is not set. Delivery skipped.');
            } else {
                const leadUrl = `${config.adminFrontendUrl.replace(/\/$/, '')}/admin/leads/${lead._id}`;
                const waMessage = `🌻 Lead Update (${lead.status})
Name: ${name}
Company: ${companyName || 'N/A'}
Phone: ${phone}
Message: ${message || 'N/A'}
Source: ${source}${sourceDomain ? ` (${sourceDomain}${sourcePage || ''})` : ''}${locale ? `
Language: ${locale}` : ''}
Count: ${lead.contactCount}
Status: ${lead.status}
Open: ${leadUrl}`;

                if (config.whatsapp.instanceId && config.whatsapp.token) {
                    void sendTextMessage(config.adminPhone, waMessage)
                    .then((result) => {
                        const eventType = result.success ? 'whatsapp_notified' : 'notification_failed';
                        return Lead.findByIdAndUpdate(lead!._id, {
                            $push: { timeline: { type: eventType, at: new Date(), meta: { channel: 'whatsapp', to: 'admin' } } }
                        });
                    })
                    .catch((err: Error) => console.warn('[WhatsApp] Background delivery crashed:', err.message));
                }

                if (isSmsConfigured()) {
                    const smsMessage = buildLeadNotificationSms({
                        name,
                        companyName,
                        phone,
                        email,
                        message,
                        source,
                        sourceDomain,
                        sourcePage,
                        contactCount: lead.contactCount,
                        leadUrl,
                    });
                    void sendSms(config.adminPhone, smsMessage)
                        .then((result) => {
                            const eventType = result.success ? 'sms_notified' : 'notification_failed';
                            return Lead.findByIdAndUpdate(lead!._id, {
                                $push: { timeline: { type: eventType, at: new Date(), meta: { channel: 'sms', to: 'admin' } } }
                            });
                        })
                        .catch((err: Error) => console.warn('[SMS] Background delivery crashed:', err.message));
                }
            }
        } catch (notificationError) {
            console.warn('[Notifications] Dispatch crashed:', notificationError);
        }

        // Public callers get only safe fields — the full lead document (timeline,
        // notes, ownerId, …) is internal CRM data. Authenticated staff keep the
        // original full-lead shape for backward compatibility.
        if (req.user) {
            res.status(201).json({
                success: true,
                message: 'Lead received successfully',
                lead: lead,
            });
        } else {
            res.status(201).json({
                success: true,
                message: 'Lead received successfully',
                leadId: lead._id,
            });
        }
    } catch (error) {
        next(error);
    }
};

// Public website entry is rate-limited. The dedicated manual route is
// authenticated and intentionally bypasses the public IP budget so a busy
// office/network can still enter legitimate leads from the admin console.
router.post('/', createLeadLimiter, createOrUpdateLead);
router.post('/manual', protect, authorize('admin'), createOrUpdateLead);

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
            ...(status === 'contacted' && { lastContactAt: new Date() }),
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

        // Capture previous state for automation diffing.
        const previous = await Lead.findOne(query).select('status assignedTo').lean();

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

        // Fire automation events (side-effect only, never blocks the response)
        if (previous && status && previous.status !== status) {
            await dispatchAutomation({
                event: 'lead.status_changed',
                payload: {
                    leadId: lead._id.toString(),
                    leadName: lead.name,
                    from: previous.status,
                    to: status,
                    assignedTo: lead.assignedTo,
                    actorId: req.user?._id?.toString(),
                },
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
