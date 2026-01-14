
import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/Order.js';

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
        const { customerId, items, totalAmount } = req.body;

        // In a real app with auth, we'd get customerId from the token's user.
        // For now we might need to find the Customer associated with the user if customerId isn't provided,
        // or expect the frontend to send the customerId. 
        // Assuming for this MVP the frontend sends all necessary data or we mock it.

        // If items are missing or structure is wrong, Validation should happen here.

        const newOrder = new OrderModel({
            customer: customerId, // Assuming ID is passed
            items,
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

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            id,
            { status },
            { new: true } // Return updated doc
        );

        if (!updatedOrder) {
            res.status(404).json({ message: "Order not found" });
            return;
        }

        res.json(updatedOrder);
    } catch (error) {
        console.error("Update Order Error:", error);
        res.status(500).json({ message: "Failed to update order" });
    }
});

export default router;
