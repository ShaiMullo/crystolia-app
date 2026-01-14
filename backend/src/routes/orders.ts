
import { Router, Request, Response } from 'express';

const router = Router();

// In-Memory Orders DB
const orders: any[] = [
    {
        _id: "1001",
        customer: {
            _id: "cus_1",
            businessName: "מסעדת הזית הירוק",
            contactPerson: "ישראל ישראלי",
            phone: "050-1234567"
        },
        status: "pending",
        items: [
            { productType: "1L", quantity: 10, unitPrice: 25, totalPrice: 250 },
            { productType: "5L", quantity: 5, unitPrice: 110, totalPrice: 550 }
        ],
        totalAmount: 800,
        createdAt: new Date().toISOString()
    },
    {
        _id: "1002",
        customer: {
            _id: "cus_2",
            businessName: "קייטרינג גולדן",
            contactPerson: "שרה כהן",
            phone: "052-9876543"
        },
        status: "approved",
        items: [
            { productType: "18L", quantity: 2, unitPrice: 380, totalPrice: 760 }
        ],
        totalAmount: 760,
        createdAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
    }
];

// GET /api/orders - Get all orders
router.get('/', (req: Request, res: Response) => {
    res.json(orders);
});

// POST /api/orders - Create new order
router.post('/', (req: Request, res: Response) => {
    const newOrder = {
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: "pending",
        ...req.body
    };
    orders.unshift(newOrder); // Add to beginning
    res.status(201).json(newOrder);
});

// PATCH /api/orders/:id - Update order status
router.patch('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const orderIndex = orders.findIndex(o => o._id === id);
    if (orderIndex === -1) {
        res.status(404).json({ message: "Order not found" });
        return;
    }

    orders[orderIndex].status = status;
    res.json(orders[orderIndex]);
});

export default router;
