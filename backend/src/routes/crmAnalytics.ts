// ===============================================
// 📈 CRM Analytics Routes
// ===============================================
// Lightweight aggregations over Lead, Order, Invoice, AuditLog, Task.

import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Task from '../models/Task.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const PIPELINE_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived'] as const;

// ━━ GET /api/crm/analytics/pipeline
router.get('/pipeline', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [byStatusAgg, totalLeads, wonThisMonth, lostThisMonth, wonPrevMonth, convertedTotal, agentAgg, overdueTasks] = await Promise.all([
            Lead.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Lead.countDocuments({ isDeleted: false }),
            Lead.countDocuments({ isDeleted: false, status: 'won', updatedAt: { $gte: monthStart } }),
            Lead.countDocuments({ isDeleted: false, status: 'lost', updatedAt: { $gte: monthStart } }),
            Lead.countDocuments({ isDeleted: false, status: 'won', updatedAt: { $gte: prevMonthStart, $lt: monthStart } }),
            Lead.countDocuments({ isDeleted: false, status: 'converted' }),
            Lead.aggregate([
                { $match: { isDeleted: false, status: { $in: ['won', 'converted'] }, assignedTo: { $ne: null } } },
                { $group: { _id: '$assignedTo', wins: { $sum: 1 } } },
                { $sort: { wins: -1 } },
                { $limit: 5 },
            ]),
            Task.countDocuments({ isDeleted: false, status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: now } }),
        ]);

        // Active pipeline value: sum of non-cancelled order totals scoped to companies that came from leads.
        // Cheap proxy: sum of order totals where status not cancelled.
        const pipelineRevenueAgg = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const outstandingInvoicesAgg = await Invoice.aggregate([
            { $match: { status: 'issued' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);

        const byStatus: Record<string, number> = {};
        for (const s of PIPELINE_STATUSES) byStatus[s] = 0;
        for (const row of byStatusAgg) {
            if (typeof row._id === 'string') byStatus[row._id] = row.count;
        }

        const closed = wonThisMonth + lostThisMonth;
        const winRate = closed > 0 ? wonThisMonth / closed : 0;
        const winRateTrend = wonPrevMonth > 0 ? (wonThisMonth - wonPrevMonth) / wonPrevMonth : 0;
        const conversionRate = totalLeads > 0 ? convertedTotal / totalLeads : 0;

        // Hydrate top agents with names — but only if we have any.
        let topAgents: Array<{ id: string; label: string; wins: number }> = [];
        if (agentAgg.length > 0) {
            const ids = agentAgg.map((a) => a._id).filter(Boolean);
            const objectIds = ids.map((id: string) => {
                try { return new mongoose.Types.ObjectId(id); } catch { return null; }
            }).filter(Boolean) as mongoose.Types.ObjectId[];
            const users = await mongoose.connection.collection('users')
                .find({ _id: { $in: objectIds } })
                .project({ name: 1, email: 1 })
                .toArray();
            const userMap = new Map(users.map((u) => [String(u._id), u]));
            topAgents = agentAgg.map((a) => {
                const u = userMap.get(String(a._id));
                return {
                    id: String(a._id),
                    label: (u?.name as string | undefined) || (u?.email as string | undefined) || String(a._id),
                    wins: a.wins,
                };
            });
        }

        // Avg response time = avg minutes between lead.createdAt and the first
        // non-creation timeline event (contacted / note_added). Computed in JS
        // over the most recent 200 leads to avoid heavy aggregation.
        const recentLeads = await Lead.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(200)
            .select('createdAt timeline')
            .lean();
        let responseSamples = 0;
        let responseSumMs = 0;
        for (const l of recentLeads) {
            const firstResp = (l.timeline || []).find((e) => e.type !== 'lead_created' && e.type !== 'lead_updated');
            if (firstResp && firstResp.at && l.createdAt) {
                const ms = new Date(firstResp.at).getTime() - new Date(l.createdAt).getTime();
                if (ms > 0) {
                    responseSamples += 1;
                    responseSumMs += ms;
                }
            }
        }
        const avgResponseMinutes = responseSamples > 0 ? Math.round(responseSumMs / responseSamples / 60000) : null;

        res.json({
            success: true,
            data: {
                totals: {
                    totalLeads,
                    wonThisMonth,
                    lostThisMonth,
                    convertedTotal,
                    overdueTasks,
                    pipelineRevenue: pipelineRevenueAgg[0]?.total || 0,
                    outstandingInvoices: outstandingInvoicesAgg[0]?.total || 0,
                },
                rates: {
                    winRate,
                    winRateTrend,
                    conversionRate,
                },
                byStatus,
                topAgents,
                avgResponseMinutes,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/activity - unified activity feed
router.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
        const entity = typeof req.query.entity === 'string' ? req.query.entity : undefined;

        const filter: Record<string, unknown> = {};
        if (entity) filter.entity = entity;

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('performedBy', 'name email role')
            .lean();

        res.json({ success: true, data: logs });
    } catch (err) {
        next(err);
    }
});

export default router;
