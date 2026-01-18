
import { Router, Request, Response } from 'express';
import { PaymentModel } from '../models/Payment.js';
import { OrderModel } from '../models/Order.js';
import { paymentService } from '../services/paymentService.js';
import { CustomerModel } from '../models/Customer.js';

const router = Router();

// POST /api/payments/checkout
// Create a payment transaction
router.post('/checkout', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

        const order = await OrderModel.findById(orderId).populate('customer');
        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        const customer = await CustomerModel.findById(order.customer);
        if (!customer) {
            res.status(404).json({ message: "Customer not found" });
            return;
        }

        // Create initial Payment record
        const payment = new PaymentModel({
            order: order._id,
            customer: customer._id,
            amount: order.totalAmount,
            provider: process.env.PAYMENT_PROVIDER || 'mock',
            status: 'pending'
        });
        await payment.save();

        // Initiate checkout with provider
        const response = await paymentService.initiatePayment({
            orderId: order._id.toString(),
            amount: order.totalAmount,
            customer: {
                name: customer.businessName,
                email: customer.email,
                phone: customer.phone
            },
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/he/orders/${orderId}?payment_success=true`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/he/orders/${orderId}?payment_cancel=true`
        });

        // Update payment with transaction ID
        payment.transactionId = response.paymentId;
        await payment.save();

        res.json(response);

    } catch (error) {
        console.error("Checkout Error:", error);
        res.status(500).json({ message: "Failed to initiate checkout" });
    }
});

// POST /api/payments/callback
// Handle payment notifications
router.post('/callback', async (req: Request, res: Response) => {
    // Logic for verifying payment status from provider callbacks
    // For Mock, this might not be hit if we just redirect on success
    res.json({ received: true });
});

export default router;
