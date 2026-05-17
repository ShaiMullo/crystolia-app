// ===============================================
// 📦 CRM Products Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const UNITS = new Set(['unit', 'box', 'liter', 'kg', 'gram', 'package']);

function pickPayload(body: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    if (typeof body.name === 'string') out.name = body.name.trim();
    if (typeof body.sku === 'string') out.sku = body.sku.trim();
    if (typeof body.category === 'string') out.category = body.category.trim() || undefined;
    if (typeof body.description === 'string') out.description = body.description.trim() || undefined;
    if (typeof body.unit === 'string' && UNITS.has(body.unit)) out.unit = body.unit;
    if (typeof body.price === 'number') out.price = body.price;
    if (typeof body.currency === 'string') out.currency = body.currency.trim().toUpperCase();
    if (typeof body.taxRate === 'number') out.taxRate = body.taxRate;
    if (typeof body.isActive === 'boolean') out.isActive = body.isActive;
    if (typeof body.stockTrackingEnabled === 'boolean') out.stockTrackingEnabled = body.stockTrackingEnabled;
    if (Array.isArray(body.tags)) out.tags = (body.tags as unknown[]).filter((t) => typeof t === 'string');
    return out;
}

// ━━ GET /api/crm/products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, parseInt(req.query.limit as string) || 50);

        const filter: Record<string, unknown> = { isDeleted: false };
        if (typeof req.query.isActive === 'string') filter.isActive = req.query.isActive !== 'false';
        if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category;
        if (typeof req.query.search === 'string' && req.query.search) {
            const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: rx }, { sku: rx }, { category: rx }];
        }

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: products,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Product ID', 400);
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!product) throw new AppError('Product not found', 404);
        const inventory = await Inventory.find({ product: product._id }).lean();
        res.json({ success: true, data: { ...product, inventory } });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/products
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = pickPayload(req.body || {});
        if (!payload.name) throw new AppError('name is required', 400);
        if (!payload.sku) throw new AppError('sku is required', 400);

        try {
            const product = await Product.create({ ...payload, createdBy: req.user?._id });
            await logAudit({
                action: 'CREATE',
                entity: 'Product',
                entityId: product._id.toString(),
                req,
                details: { name: product.name, sku: product.sku },
            });
            res.status(201).json({ success: true, data: product.toObject() });
        } catch (err: unknown) {
            if ((err as { code?: number }).code === 11000) throw new AppError('SKU already exists', 409);
            throw err;
        }
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/products/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Product ID', 400);
        const payload = pickPayload(req.body || {});

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            payload,
            { new: true, runValidators: true },
        );
        if (!product) throw new AppError('Product not found', 404);

        await logAudit({
            action: 'UPDATE',
            entity: 'Product',
            entityId: product._id.toString(),
            req,
            details: payload,
        });

        res.json({ success: true, data: product.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ DELETE /api/crm/products/:id (soft)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Product ID', 400);
        const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
        if (!product) throw new AppError('Product not found', 404);
        product.isDeleted = true;
        product.deletedAt = new Date();
        await product.save();
        await logAudit({ action: 'DELETE', entity: 'Product', entityId: product._id.toString(), req });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
