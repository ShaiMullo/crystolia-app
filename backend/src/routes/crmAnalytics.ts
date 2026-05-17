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
import Inventory from '../models/Inventory.js';
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

// ━━ GET /api/crm/analytics/finance - revenue + valuation + recent orders
router.get('/finance', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            ordersRevenueAgg,
            ordersThisMonthAgg,
            paidInvoicesAgg,
            outstandingInvoicesAgg,
            overdueInvoices,
            recentOrders,
            inventoryRows,
        ] = await Promise.all([
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
            Invoice.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Invoice.aggregate([
                { $match: { status: 'issued' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
            Invoice.find({ status: 'issued', dueDate: { $lt: now } })
                .sort({ dueDate: 1 })
                .limit(10)
                .populate('company', 'name')
                .lean(),
            Order.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .populate('company', 'name')
                .lean(),
            Inventory.find({}).populate('product', 'price costPrice isDeleted stockTrackingEnabled').lean(),
        ]);

        // Inventory valuation = sum(on-hand quantity * unit cost or price fallback).
        let valuationCost = 0;
        let valuationRetail = 0;
        for (const row of inventoryRows) {
            const product = row.product as unknown as { price?: number; costPrice?: number; isDeleted?: boolean } | null;
            if (!product || product.isDeleted) continue;
            const qty = row.quantity || 0;
            valuationRetail += qty * (product.price || 0);
            valuationCost += qty * (product.costPrice ?? product.price ?? 0);
        }

        res.json({
            success: true,
            data: {
                revenue: {
                    ordersTotal: ordersRevenueAgg[0]?.total || 0,
                    ordersCount: ordersRevenueAgg[0]?.count || 0,
                    ordersThisMonth: ordersThisMonthAgg[0]?.total || 0,
                    ordersThisMonthCount: ordersThisMonthAgg[0]?.count || 0,
                    paidInvoices: paidInvoicesAgg[0]?.total || 0,
                },
                invoices: {
                    outstandingTotal: outstandingInvoicesAgg[0]?.total || 0,
                    outstandingCount: outstandingInvoicesAgg[0]?.count || 0,
                    overdueCount: overdueInvoices.length,
                    overdue: overdueInvoices.map((inv) => ({
                        _id: inv._id,
                        invoiceNumber: inv.invoiceNumber,
                        totalAmount: inv.totalAmount,
                        dueDate: inv.dueDate,
                        company: inv.company,
                    })),
                },
                inventoryValuation: {
                    cost: Math.round(valuationCost),
                    retail: Math.round(valuationRetail),
                },
                recentOrders: recentOrders.map((o) => ({
                    _id: o._id,
                    status: o.status,
                    totalAmount: o.totalAmount,
                    company: o.company,
                    itemCount: (o.items || []).length,
                    createdAt: o.createdAt,
                })),
            },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/analytics/profitability - gross profit + margins
router.get('/profitability', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await Order.find({ status: { $ne: 'cancelled' } })
            .select('items company totalAmount')
            .lean();

        // Product cost lookup.
        const products = await mongoose.connection.collection('products')
            .find({}, { projection: { costPrice: 1, price: 1, name: 1 } })
            .toArray();
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        let revenue = 0;
        let cogs = 0;
        const byProduct = new Map<string, { name: string; revenue: number; cost: number; qty: number }>();
        const byCustomerId = new Map<string, { revenue: number; cost: number }>();

        for (const order of orders) {
            const companyId = order.company ? String(order.company) : null;
            for (const item of order.items || []) {
                const qty = item.quantity || 0;
                const price = item.price || 0;
                const lineRevenue = qty * price;
                const product = item.productId ? productMap.get(String(item.productId)) : undefined;
                // Fall back to 0 cost when unknown (conservative — shows full margin).
                const unitCost = (product?.costPrice as number | undefined) ?? 0;
                const lineCost = qty * unitCost;

                revenue += lineRevenue;
                cogs += lineCost;

                if (item.productId) {
                    const key = String(item.productId);
                    const entry = byProduct.get(key) || {
                        name: (product?.name as string) || item.productName || '—',
                        revenue: 0, cost: 0, qty: 0,
                    };
                    entry.revenue += lineRevenue;
                    entry.cost += lineCost;
                    entry.qty += qty;
                    byProduct.set(key, entry);
                }
                if (companyId) {
                    const entry = byCustomerId.get(companyId) || { revenue: 0, cost: 0 };
                    entry.revenue += lineRevenue;
                    entry.cost += lineCost;
                    byCustomerId.set(companyId, entry);
                }
            }
        }

        const grossProfit = Math.round(revenue - cogs);
        const marginPct = revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 100) : 0;

        // Hydrate customer names.
        const companyIds = [...byCustomerId.keys()]
            .map((id) => { try { return new mongoose.Types.ObjectId(id); } catch { return null; } })
            .filter(Boolean) as mongoose.Types.ObjectId[];
        const companies = await mongoose.connection.collection('companies')
            .find({ _id: { $in: companyIds } }, { projection: { name: 1 } })
            .toArray();
        const companyNameMap = new Map(companies.map((c) => [String(c._id), c.name as string]));

        const topProducts = [...byProduct.entries()]
            .map(([id, v]) => ({
                productId: id,
                name: v.name,
                revenue: Math.round(v.revenue),
                profit: Math.round(v.revenue - v.cost),
                marginPct: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
                qty: v.qty,
            }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 8);

        const topCustomers = [...byCustomerId.entries()]
            .map(([id, v]) => ({
                companyId: id,
                name: companyNameMap.get(id) || '—',
                revenue: Math.round(v.revenue),
                profit: Math.round(v.revenue - v.cost),
                marginPct: v.revenue > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : 0,
            }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 8);

        res.json({
            success: true,
            data: {
                totals: {
                    revenue: Math.round(revenue),
                    cogs: Math.round(cogs),
                    grossProfit,
                    marginPct,
                },
                topProducts,
                topCustomers,
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;
