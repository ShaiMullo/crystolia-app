
import { Router, Request, Response } from 'express';

const router = Router();

// In-Memory Customers DB
const customers: any[] = [
    {
        _id: "cus_1",
        businessName: "מסעדת הזית הירוק",
        contactPerson: "ישראל ישראלי",
        phone: "050-1234567",
        email: "olive@restaurant.com",
        address: { street: "הזית 10", city: "תל אביב" },
        pricingTier: "gold"
    },
    {
        _id: "cus_2",
        businessName: "קייטרינג גולדן",
        contactPerson: "שרה כהן",
        phone: "052-9876543",
        email: "info@golden.co.il",
        address: { street: "הרימון 5", city: "רמת גן" },
        pricingTier: "platinum"
    },
    {
        _id: "cus_3",
        businessName: "מלון רויאל",
        contactPerson: "דוד לוי",
        phone: "03-5551234",
        email: "orders@royal.com",
        address: { street: "הירקון 100", city: "תל אביב" },
        pricingTier: "enterprise"
    }
];

// GET /api/customers - Get all customers
router.get('/', (req: Request, res: Response) => {
    res.json(customers);
});

// GET /api/customers/my-profile - Get current user profile (Mock)
router.get('/my-profile', (req: Request, res: Response) => {
    // In a real app, we would get the user ID from the token (req.user)
    // For now, return the first customer as a mock
    res.json(customers[0]);
});

export default router;
