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
import { runRequiredTransaction } from '../db/withTransaction.js';
import { reconcileInventory, reconciliationStatus, reconciliationHistory } from '../services/reconciliationService.js';
import { createNotification } from '../services/notificationService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const TYPES = new Set<MovementType>(['in', 'out', 'adjustment', 'reserved', 'released']);

// ━━ GET /api/crm/inventory/reconciliation - drift status (read-only)
router.get('/reconciliation', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await reconciliationStatus();
        res.json({ success: true, data: status });
    } catch (err) {
        next(err);
    }
});

// ━━ GET /api/crm/inventory/reconciliation/history - past runs
router.get('/reconciliation/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const history = await reconciliationHistory(limit);
        res.json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/inventory/reconciliation - run reconciliation
//    body: { autoFix?: boolean, notifyOnDrift?: boolean }
router.post('/reconciliation', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const autoFix = req.body?.autoFix === true;
        const result = await reconcileInventory(autoFix, req.user?._id?.toString());

        await logAudit({
            action: 'UPDATE',
            entity: 'Inventory',
            entityId: 'reconciliation',
            req,
            details: {
                scannedOrders: result.scannedOrders,
                driftCount: result.discrepancies.length,
                fixed: result.fixed,
            },
        });

        if (req.body?.notifyOnDrift === true && result.discrepancies.length > 0 && req.user?._id) {
            await createNotification({
                recipientId: req.user._id,
                type: 'automation_triggered',
                title: `Inventory reconciliation: ${result.discrepancies.length} discrepancies`,
                body: result.fixed ? 'Discrepancies were auto-fixed.' : 'Run with autoFix to correct them.',
                link: '/admin/inventory',
                icon: 'RefreshCw',
            });
        }

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
});

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

        // Production stock mutation — REQUIRES a transaction so the summary
        // row and the movement log commit together or not at all. On a
        // standalone deployment this surfaces as an operational 503
        // (TransactionsUnavailableError via the error handler) with no writes.
        const { inventory, movement } = await runRequiredTransaction((session) => applyMovement({
            productId,
            location,
            type,
            quantity,
            reason,
            relatedOrderId,
            actorId: req.user?._id,
            session,
        }));

        await logAudit({
            action: 'CREATE',
            entity: 'InventoryMovement',
            entityId: movement._id.toString(),
            req,
            details: { productId: productId.toString(), type, quantity, reason },
        });

        // Fire low-stock automation when this movement drops available below the threshold.
        const available = Math.max(0, (inventory.quantity || 0) - (inventory.reservedQuantity || 0));
        if ((inventory.minimumQuantity || 0) > 0 && available <= inventory.minimumQuantity) {
            await dispatchAutomation({
                event: 'inventory.low_stock',
                payload: {
                    productId: productId.toString(),
                    productName: product.name,
                    available,
                    minimum: inventory.minimumQuantity,
                    actorId: req.user?._id?.toString(),
                },
            });
        }

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
