
import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/Order.js';
import { CustomerModel } from '../models/Customer.js';

const router = Router();

// GET /api/orders - Get all orders (populated with customer details)
router.get('/', async (req: Request, res: Response) => {
    try {
        const orders = await OrderModel.find().populate('customer').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error("Get Orders Error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
});

// POST /api/orders - Create new order
router.post('/', async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        // 1. Calculate Prices
        const PRICES: Record<string, number> = {
            "1L": 25,
            "5L": 110,
            "18L": 380
        };

        let totalAmount = 0;
        const enrichedItems = items.map((item: any) => {
            const unitPrice = PRICES[item.productType] || 0;
            const totalPrice = unitPrice * item.quantity;
            totalAmount += totalPrice;
            return {
                ...item,
                unitPrice,
                totalPrice
            };
        });

        // 2. Find Customer (Fallback to first customer if no auth context)
        // In a real app, req.user would have the ID.
        // For this demo, we'll assign the order to the first customer found.
        // For this demo, we'll assign the order to the first customer found.
        const customer = await CustomerModel.findOne();

        if (!customer) {
            res.status(400).json({ message: "No customer profile found" });
            return;
        }

        const newOrder = new OrderModel({
            customer: customer._id,
            items: enrichedItems,
            totalAmount,
            status: 'pending'
        });

        await newOrder.save();
        res.status(201).json(newOrder);

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ message: "Failed to create order" });
    }
});

// PATCH /api/orders/:id - Update order status
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await OrderModel.findById(id).populate('customer');

        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        const previousStatus = order.status;
        order.status = status;

        // If status changed to 'approved', create invoice via Green Invoice
        if (status === 'approved' && previousStatus !== 'approved') {
            try {
                const { createInvoice, isGreenInvoiceConfigured } = await import('../services/greenInvoice.js');

                if (isGreenInvoiceConfigured()) {
                    const customer = order.customer as any;

                    // Create invoice in Green Invoice
                    const invoiceData = await createInvoice({
                        client: {
                            name: customer?.businessName || 'לקוח',
                            emails: customer?.email ? [customer.email] : [],
                            address: customer?.address || '',
                            city: customer?.city || '',
                            phone: customer?.phone || '',
                            taxId: customer?.businessId || ''
                        },
                        items: order.items.map((item: any) => ({
                            description: `שמן חמניות - ${item.productType}`,
                            quantity: item.quantity,
                            price: item.unitPrice,
                            currency: 'ILS'
                        })),
                        type: 320 // חשבונית מס
                    });

                    // Save invoice reference to order
                    order.invoiceId = invoiceData.id;
                    order.invoiceUrl = invoiceData.url || '';
                    console.log(`✅ Invoice created for order ${id}: ${invoiceData.id}`);
                } else {
                    console.log('⚠️ Green Invoice not configured, skipping invoice creation');
                }
            } catch (invoiceError) {
                console.error('❌ Failed to create invoice:', invoiceError);
                // Continue with order update even if invoice fails
            }
        }

        await order.save();
        res.json(order);
    } catch (error) {
        console.error("Update Order Error:", error);
        res.status(500).json({ message: "Failed to update order" });
    }
});

export default router;
