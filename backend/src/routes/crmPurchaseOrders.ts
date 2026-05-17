// ===============================================
// 📥 CRM Purchase Orders Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import PurchaseOrder, { PurchaseOrderStatus } from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { computePoTotal, receivePurchaseOrder, ReceiptLine } from '../services/purchaseOrderService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const STATUSES = new Set<PurchaseOrderStatus>(['draft', 'ordered', 'partially_received', 'received', 'cancelled']);

interface RawPoItem {
    productId?: string;
    quantity?: number;
    unitCost?: number;
}

// Resolve + validate PO item lines against the product catalog.
async function resolveItems(rawItems: unknown): Promise<Array<{ product: string; productName: string; quantity: number; receivedQuantity: number; unitCost: number }>> {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new AppError('A purchase order needs at least one item', 400);
    }
    const items = [];
    for (const raw of rawItems as RawPoItem[]) {
        if (!raw.productId || !validate.objectId(raw.productId)) throw new AppError('Each item needs a valid productId', 400);
        if (!raw.quantity || raw.quantity <= 0) throw new AppError('Each item needs a positive quantity', 400);
        const unitCost = Number(raw.unitCost) || 0;
        // eslint-disable-next-line no-await-in-loop
        const product = await Product.findById(raw.productId).select('name costPrice');
        if (!product) throw new AppError(`Product ${raw.productId} not found`, 404);
        items.push({
            product: raw.productId,
            productName: product.name,
            quantity: raw.quantity,
            receivedQuantity: 0,
            unitCost: unitCost || product.costPrice || 0,
        });
    }
    return items;
}

// ━━ GET /api/crm/purchase-orders
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
        const filter: Record<string, unknown> = {};
        if (typeof req.query.status === 'string' && STATUSES.has(req.query.status as PurchaseOrderStatus)) {
            filter.status = req.query.status;
        }
        if (typeof req.query.supplierId === 'string' && validate.objectId(req.query.supplierId)) {
            filter.supplier = req.query.supplierId;
        }
        const [pos, total] = await Promise.all([
            PurchaseOrder.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('supplier', 'name')
                .lean(),
            PurchaseOrder.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data: pos,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/purchase-orders/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid PO ID', 400);
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('supplier', 'name email phone')
            .lean();
        if (!po) throw new AppError('Purchase order not found', 404);
        res.json({ success: true, data: po });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/purchase-orders
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        if (!body.supplierId || !validate.objectId(body.supplierId)) {
            throw new AppError('A valid supplierId is required', 400);
        }
        const supplier = await Supplier.findOne({ _id: body.supplierId, isDeleted: false });
        if (!supplier) throw new AppError('Supplier not found', 404);

        const items = await resolveItems(body.items);
        const totalCost = computePoTotal(items);
        const now = new Date();
        const actorId = req.user?._id?.toString();
        const poNumber = `PO-${now.getFullYear()}-${Date.now().toString().slice(-6)}`;
        const status: PurchaseOrderStatus = STATUSES.has(body.status) ? body.status : 'draft';

        const po = await PurchaseOrder.create({
            poNumber,
            supplier: supplier._id,
            status,
            items,
            totalCost,
            notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
            expectedAt: body.expectedAt ? new Date(body.expectedAt) : undefined,
            orderedAt: status === 'ordered' ? now : undefined,
            createdBy: req.user?._id,
            timeline: [{ type: 'po_created', at: now, actorId }],
        });

        await logAudit({ action: 'CREATE', entity: 'PurchaseOrder', entityId: po._id.toString(), req, details: { poNumber, totalCost } });
        res.status(201).json({ success: true, data: po.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/purchase-orders/:id - status / notes (not items once ordered)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid PO ID', 400);
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) throw new AppError('Purchase order not found', 404);

        const body = req.body || {};
        const now = new Date();
        const actorId = req.user?._id?.toString();

        if (Array.isArray(body.items)) {
            if (po.status !== 'draft') throw new AppError('Items can only be edited while the PO is a draft', 409);
            const items = await resolveItems(body.items);
            po.items = items as unknown as typeof po.items;
            po.totalCost = computePoTotal(items);
            po.timeline.push({ type: 'po_items_updated', at: now, actorId });
        }
        if (typeof body.notes === 'string') po.notes = body.notes.trim();
        if (body.expectedAt) po.expectedAt = new Date(body.expectedAt);

        if (typeof body.status === 'string') {
            if (!STATUSES.has(body.status as PurchaseOrderStatus)) throw new AppError('Invalid status', 400);
            // Receiving must go through POST /:id/receive — block manual jumps.
            if (body.status === 'received' || body.status === 'partially_received') {
                throw new AppError('Use the receive endpoint to record stock receipts', 400);
            }
            if (body.status !== po.status) {
                const from = po.status;
                po.status = body.status as PurchaseOrderStatus;
                if (po.status === 'ordered' && !po.orderedAt) po.orderedAt = now;
                po.timeline.push({ type: 'status_changed', at: now, actorId, meta: { from, to: po.status } });
            }
        }

        await po.save();
        await logAudit({ action: 'UPDATE', entity: 'PurchaseOrder', entityId: po._id.toString(), req, details: { status: po.status } });
        res.json({ success: true, data: po.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/purchase-orders/:id/receive
//    body: { receipts: [{ productId, quantity }] }
router.post('/:id/receive', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid PO ID', 400);
        const receipts = req.body?.receipts;
        if (!Array.isArray(receipts) || receipts.length === 0) {
            throw new AppError('receipts array is required', 400);
        }

        let result;
        try {
            result = await receivePurchaseOrder(req.params.id, receipts as ReceiptLine[], req.user?._id?.toString());
        } catch (e) {
            const msg = (e as Error).message;
            if (msg === 'Purchase order not found') throw new AppError(msg, 404);
            if (
                msg.includes('cancelled') ||
                msg.includes('already fully received') ||
                msg.includes('not on this purchase order') ||
                msg.includes('only')
            ) {
                throw new AppError(msg, 400);
            }
            throw e;
        }

        await logAudit({
            action: 'UPDATE',
            entity: 'PurchaseOrder',
            entityId: req.params.id,
            req,
            details: { received: result.received, status: result.status },
        });

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

export default router;
