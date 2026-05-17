// ===============================================
// 🏭 CRM Suppliers Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

function pickPayload(body: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    if (typeof body.name === 'string') out.name = body.name.trim();
    if (typeof body.contactName === 'string') out.contactName = body.contactName.trim() || undefined;
    if (typeof body.email === 'string') out.email = body.email.trim().toLowerCase() || undefined;
    if (typeof body.phone === 'string') out.phone = body.phone.trim() || undefined;
    if (typeof body.address === 'string') out.address = body.address.trim() || undefined;
    if (typeof body.city === 'string') out.city = body.city.trim() || undefined;
    if (typeof body.vatNumber === 'string') out.vatNumber = body.vatNumber.trim() || undefined;
    if (typeof body.isActive === 'boolean') out.isActive = body.isActive;
    return out;
}

// ━━ GET /api/crm/suppliers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
        const filter: Record<string, unknown> = { isDeleted: false };
        if (typeof req.query.search === 'string' && req.query.search) {
            filter.name = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        const [suppliers, total] = await Promise.all([
            Supplier.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            Supplier.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data: suppliers,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/suppliers/:id - detail incl. linked products
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Supplier ID', 400);
        const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!supplier) throw new AppError('Supplier not found', 404);
        const products = await Product.find({ supplierId: supplier._id, isDeleted: false })
            .select('name sku price costPrice unit isActive')
            .lean();
        res.json({ success: true, data: { ...supplier, products } });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/suppliers
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = pickPayload(req.body || {});
        if (!payload.name) throw new AppError('name is required', 400);
        const supplier = await Supplier.create({ ...payload, createdBy: req.user?._id });
        await logAudit({ action: 'CREATE', entity: 'Supplier', entityId: supplier._id.toString(), req, details: { name: supplier.name } });
        res.status(201).json({ success: true, data: supplier.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/suppliers/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Supplier ID', 400);
        const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });
        if (!supplier) throw new AppError('Supplier not found', 404);

        const payload = pickPayload(req.body || {});
        Object.assign(supplier, payload);

        if (typeof req.body?.note === 'string' && req.body.note.trim()) {
            supplier.notes.push({ text: req.body.note.trim(), createdAt: new Date(), actorId: req.user?._id?.toString() });
        }
        await supplier.save();
        await logAudit({ action: 'UPDATE', entity: 'Supplier', entityId: supplier._id.toString(), req, details: payload });
        res.json({ success: true, data: supplier.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ DELETE /api/crm/suppliers/:id (soft)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Supplier ID', 400);
        const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });
        if (!supplier) throw new AppError('Supplier not found', 404);
        supplier.isDeleted = true;
        supplier.deletedAt = new Date();
        await supplier.save();
        await logAudit({ action: 'DELETE', entity: 'Supplier', entityId: supplier._id.toString(), req });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
