// ===============================================
// 🚚 CRM Shipments Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import Shipment, { ShipmentStatus } from '../models/Shipment.js';
import Order from '../models/Order.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, AppError } from '../utils/validation.js';
import { logAudit } from '../services/auditService.js';
import { changeShipmentStatus } from '../services/shipmentService.js';
import { dispatch as dispatchAutomation } from '../services/automationService.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

const STATUSES = new Set<ShipmentStatus>(['pending', 'shipped', 'in_transit', 'delivered', 'cancelled']);

// ━━ GET /api/crm/shipments?orderId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filter: Record<string, unknown> = {};
        if (typeof req.query.orderId === 'string' && validate.objectId(req.query.orderId)) {
            filter.order = req.query.orderId;
        }
        if (typeof req.query.status === 'string' && STATUSES.has(req.query.status as ShipmentStatus)) {
            filter.status = req.query.status;
        }
        const shipments = await Shipment.find(filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('order', 'totalAmount status')
            .populate('company', 'name')
            .lean();
        res.json({ success: true, data: shipments });
    } catch (err) {
        next(err);
    }
});

// ━━ POST /api/crm/shipments - create a shipment for an order
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body || {};
        if (!body.orderId || !validate.objectId(body.orderId)) {
            throw new AppError('A valid orderId is required', 400);
        }
        const order = await Order.findById(body.orderId).select('company');
        if (!order) throw new AppError('Order not found', 404);

        const now = new Date();
        const actorId = req.user?._id?.toString();
        const shipment = await Shipment.create({
            order: order._id,
            company: order.company,
            status: STATUSES.has(body.status) ? body.status : 'pending',
            courier: typeof body.courier === 'string' ? body.courier.trim() : undefined,
            trackingNumber: typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() : undefined,
            notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
            createdBy: req.user?._id,
            timeline: [{ type: 'shipment_created', at: now, actorId }],
        });

        await logAudit({
            action: 'CREATE',
            entity: 'Shipment',
            entityId: shipment._id.toString(),
            req,
            details: { orderId: body.orderId, status: shipment.status },
        });

        res.status(201).json({ success: true, data: shipment.toObject() });
    } catch (err) {
        next(err);
    }
});

// ━━ PATCH /api/crm/shipments/:id - update fields / status
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!validate.objectId(req.params.id)) throw new AppError('Invalid Shipment ID', 400);
        const body = req.body || {};

        // Status change goes through the service (transaction-safe).
        if (typeof body.status === 'string') {
            if (!STATUSES.has(body.status as ShipmentStatus)) throw new AppError('Invalid status', 400);
            let result;
            try {
                result = await changeShipmentStatus(req.params.id, body.status as ShipmentStatus, req.user?._id?.toString());
            } catch (e) {
                if ((e as Error).message === 'Shipment not found') throw new AppError('Shipment not found', 404);
                throw e;
            }
            if (body.status === 'delivered') {
                const shipment = await Shipment.findById(req.params.id).select('order company trackingNumber').lean();
                await dispatchAutomation({
                    event: 'shipment.delivered',
                    payload: {
                        shipmentId: req.params.id,
                        orderId: shipment?.order?.toString(),
                        trackingNumber: shipment?.trackingNumber,
                        actorId: req.user?._id?.toString(),
                    },
                });
            }
            await logAudit({ action: 'UPDATE', entity: 'Shipment', entityId: req.params.id, req, details: { status: result.status } });
        }

        // Non-status field edits.
        const fieldUpdates: Record<string, unknown> = {};
        if (typeof body.courier === 'string') fieldUpdates.courier = body.courier.trim();
        if (typeof body.trackingNumber === 'string') fieldUpdates.trackingNumber = body.trackingNumber.trim();
        if (typeof body.notes === 'string') fieldUpdates.notes = body.notes.trim();
        if (Object.keys(fieldUpdates).length > 0) {
            await Shipment.updateOne({ _id: req.params.id }, { $set: fieldUpdates });
        }

        const updated = await Shipment.findById(req.params.id).lean();
        if (!updated) throw new AppError('Shipment not found', 404);
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
});

export default router;
