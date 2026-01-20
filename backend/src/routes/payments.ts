import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment/PaymentService.js';
import { OrderModel } from '../models/Order.js';

const router = Router();

// POST /api/payments/create
// Initiate a new payment
router.post('/create', async (req: Request, res: Response) => {
    try {
        const { orderId, provider = 'hyp' } = req.body;

        if (!orderId) {
            res.status(400).json({ error: 'Missing orderId' });
            return;
        }

        // 1. Fetch Order
        const order = await OrderModel.findById(orderId).populate('customer');
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        if (order.status === 'paid' || order.status === 'cancelled') {
            res.status(400).json({ error: `Order is already ${order.status}` });
            return;
        }

        const customer = order.customer as any;
        const customerInfo = {
            name: customer.businessName || customer.contactPerson || 'Customer',
            email: customer.email || '',
            phone: customer.phone || '',
            id: customer._id.toString()
        };

        // 2. Create Payment via Service
        const result = await paymentService.createPayment(
            provider,
            order._id.toString(),
            order.totalAmount,
            customerInfo
        );

        res.json(result);
    } catch (error: any) {
        console.error('❌ Payment Creation Error:', error);
        res.status(500).json({ error: error.message || 'Payment initiation failed' });
    }
});

// POST /api/payments/webhook/:provider
// Handle incoming webhooks (Public endpoint)
router.post('/webhook/:provider', async (req: Request, res: Response) => {
    const { provider } = req.params;

    try {
        console.log(`[Webhook] Received for ${provider}`);

        // Pass to service for verification and processing
        const result = await paymentService.handleWebhook(
            provider as string,
            req.body,
            req.headers
        );

        res.json(result);
    } catch (error: any) {
        console.error(`❌ Webhook Error (${provider}):`, error);
        // Return success to provider to stop retries, but log the failure
        // Depending on provider, you might want to return 400 for bad signatures
        if (error.message.includes('signature')) {
            res.status(400).json({ error: 'Invalid signature' });
        } else {
            res.status(200).json({ received: true, error: error.message });
        }
    }
});

export default router;
