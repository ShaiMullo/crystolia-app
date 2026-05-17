// ===============================================
// 📤 CRM Export Routes
// ===============================================
// GET /api/crm/exports/:dataset?format=csv|json

import { Router, Request, Response, NextFunction } from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Payment from '../models/Payment.js';
import { protect, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { buildExport, ExportColumn, ExportFormat } from '../services/exportService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

function refName(v: unknown): string {
    if (v && typeof v === 'object' && 'name' in v) return String((v as { name: unknown }).name);
    return '';
}

type RowMap = { columns: ExportColumn<Record<string, unknown>>[]; rows: () => Promise<Record<string, unknown>[]> };

const DATASETS: Record<string, RowMap> = {
    customers: {
        columns: [
            { key: 'company', label: 'Company', value: (r) => refName(r.company) },
            { key: 'contactName', label: 'Contact', value: (r) => (r.contactName as string) || '' },
            { key: 'contactEmail', label: 'Email', value: (r) => (r.contactEmail as string) || '' },
            { key: 'status', label: 'Status', value: (r) => (r.status as string) || '' },
            { key: 'totalOrders', label: 'Total orders', value: (r) => (r.totalOrders as number) ?? 0 },
            { key: 'totalRevenue', label: 'Total revenue', value: (r) => (r.totalRevenue as number) ?? 0 },
        ],
        rows: async () =>
            (await Customer.find({ isDeleted: false }).populate('company', 'name').limit(5000).lean()) as unknown as Record<string, unknown>[],
    },
    orders: {
        columns: [
            { key: 'id', label: 'Order ID', value: (r) => String(r._id) },
            { key: 'company', label: 'Company', value: (r) => refName(r.company) },
            { key: 'status', label: 'Status', value: (r) => (r.status as string) || '' },
            { key: 'totalAmount', label: 'Total', value: (r) => (r.totalAmount as number) ?? 0 },
            { key: 'items', label: 'Items', value: (r) => ((r.items as unknown[]) || []).length },
            { key: 'createdAt', label: 'Created', value: (r) => new Date(r.createdAt as string).toISOString() },
        ],
        rows: async () =>
            (await Order.find({}).populate('company', 'name').sort({ createdAt: -1 }).limit(5000).lean()) as unknown as Record<string, unknown>[],
    },
    inventory: {
        columns: [
            { key: 'product', label: 'Product', value: (r) => refName(r.product) },
            { key: 'location', label: 'Location', value: (r) => (r.location as string) || '' },
            { key: 'quantity', label: 'On hand', value: (r) => (r.quantity as number) ?? 0 },
            { key: 'reservedQuantity', label: 'Reserved', value: (r) => (r.reservedQuantity as number) ?? 0 },
            { key: 'available', label: 'Available', value: (r) => ((r.quantity as number) || 0) - ((r.reservedQuantity as number) || 0) },
            { key: 'minimumQuantity', label: 'Minimum', value: (r) => (r.minimumQuantity as number) ?? 0 },
        ],
        rows: async () =>
            (await Inventory.find({}).populate('product', 'name').limit(5000).lean()) as unknown as Record<string, unknown>[],
    },
    payments: {
        columns: [
            { key: 'paidAt', label: 'Date', value: (r) => new Date(r.paidAt as string).toISOString() },
            { key: 'invoice', label: 'Invoice', value: (r) => {
                const inv = r.invoice as { invoiceNumber?: string } | undefined;
                return inv?.invoiceNumber || '';
            } },
            { key: 'company', label: 'Company', value: (r) => refName(r.company) },
            { key: 'method', label: 'Method', value: (r) => (r.method as string) || '' },
            { key: 'amount', label: 'Amount', value: (r) => (r.amount as number) ?? 0 },
            { key: 'status', label: 'Status', value: (r) => (r.status as string) || '' },
        ],
        rows: async () =>
            (await Payment.find({})
                .populate('invoice', 'invoiceNumber')
                .populate('company', 'name')
                .sort({ paidAt: -1 })
                .limit(5000)
                .lean()) as unknown as Record<string, unknown>[],
    },
    profitability: {
        columns: [
            { key: 'company', label: 'Company', value: (r) => refName(r.company) },
            { key: 'status', label: 'Order status', value: (r) => (r.status as string) || '' },
            { key: 'totalAmount', label: 'Revenue', value: (r) => (r.totalAmount as number) ?? 0 },
            { key: 'createdAt', label: 'Date', value: (r) => new Date(r.createdAt as string).toISOString() },
        ],
        rows: async () =>
            (await Order.find({ status: { $ne: 'cancelled' } })
                .populate('company', 'name')
                .sort({ createdAt: -1 })
                .limit(5000)
                .lean()) as unknown as Record<string, unknown>[],
    },
};

router.get('/:dataset', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dataset = req.params.dataset;
        const def = DATASETS[dataset];
        if (!def) throw new AppError('Unknown export dataset', 404);

        const format: ExportFormat = req.query.format === 'json' ? 'json' : 'csv';
        const rows = await def.rows();
        const payload = buildExport(dataset, rows, def.columns, format);

        await logAudit({
            action: 'READ',
            entity: 'Export',
            entityId: dataset,
            req,
            details: { dataset, format, rowCount: rows.length },
        });

        res.setHeader('Content-Type', payload.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
        res.send(payload.body);
    } catch (err) {
        next(err);
    }
});

export default router;
