// ===============================================
// 📊 CRM Inventory Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Inventory from '../models/Inventory.js';
import InventoryMovement, { MovementType } from '../models/InventoryMovement.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { applyMovement } from '../services/inventoryService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const TYPES = new Set<MovementType>(['in', 'out', 'adjustment', 'reserved', 'released']);

// ━━ GET /api/crm/inventory - list inventory rows w/ product joined
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = Math.min(500, parseInt(req.query.limit as string) || 200);
        const lowOnly = req.query.lowOnly === 'true';

        const rows = await Inventory.find({})
            .populate('product', 'name sku unit category isActive stockTrackingEnabled isDeleted')
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();

        const filtered = rows
            // Hide rows whose product was soft-deleted.
            .filter((r) => r.product && !(r.product as unknown as { isDeleted?: boolean }).isDeleted)
            .map((r) => ({
                ...r,
                availableQuantity: Math.max(0, (r.quantity || 0) - (r.reservedQuantity || 0)),
                isLowStock: (r.minimumQuantity || 0) > 0 && (r.quantity - r.reservedQuantity) <= r.minimumQuantity,
            }))
            .filter((r) => !lowOnly || r.isLowStock);

        res.json({ success: true, data: filtered });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/inventory/movements - apply a movement
router.post('/movements', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId, type, quantity, reason, location, relatedOrderId } = req.body || {};
        if (!productId || !validate.objectId(productId)) throw new AppError('productId is required', 400);
        if (!type || !TYPES.has(type)) throw new AppError('Invalid movement type', 400);
        if (typeof quantity !== 'number' || quantity <= 0) {
            // adjustment to 0 is valid — special-case it
            if (!(type === 'adjustment' && quantity === 0)) {
                throw new AppError('quantity must be a positive number', 400);
            }
        }

        const product = await Product.findOne({ _id: productId, isDeleted: false });
        if (!product) throw new AppError('Product not found', 404);

        const { inventory, movement } = await applyMovement({
            productId,
            location,
            type,
            quantity,
            reason,
            relatedOrderId,
            actorId: req.user?._id,
        });

        await logAudit({
            action: 'CREATE',
            entity: 'InventoryMovement',
            entityId: movement._id.toString(),
            req,
            details: { productId: productId.toString(), type, quantity, reason },
        });

        res.status(201).json({ success: true, data: { inventory: inventory.toObject(), movement: movement.toObject() } });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/inventory/movements - movement history
router.get('/movements', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
        const filter: Record<string, unknown> = {};
        if (typeof req.query.productId === 'string' && validate.objectId(req.query.productId)) {
            filter.product = req.query.productId;
        }
        if (typeof req.query.type === 'string' && TYPES.has(req.query.type as MovementType)) {
            filter.type = req.query.type;
        }
        const [items, total] = await Promise.all([
            InventoryMovement.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('product', 'name sku unit')
                .populate('createdBy', 'name email')
                .lean(),
            InventoryMovement.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data: items,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/inventory/:productId - tweak min threshold
router.patch('/:productId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.productId)) throw new AppError('Invalid Product ID', 400);
        const location = (req.query.location as string) || 'main';
        const row = await Inventory.findOneAndUpdate(
            { product: req.params.productId, location },
            {
                $set: {
                    ...(typeof req.body?.minimumQuantity === 'number' && { minimumQuantity: req.body.minimumQuantity }),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        res.json({ success: true, data: row.toObject() });
    } catch (err) {
        next(err);
    }
});

export default router;
