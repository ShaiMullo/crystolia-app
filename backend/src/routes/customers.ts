
import { Router, Request, Response } from 'express';
import { CustomerModel } from '../models/Customer.js';

const router = Router();

// GET /api/customers - Get all customers
router.get('/', async (req: Request, res: Response) => {
    try {
        const customers = await CustomerModel.find().sort({ businessName: 1 });
        res.json(customers);
    } catch (error) {
        console.error("Get Customers Error:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
});

// GET /api/customers/my-profile - Get current user profile (Mock)
router.get('/my-profile', async (req: Request, res: Response) => {
    try {
        // In real app: const userId = req.user.id;
        // For now, return the first customer we find as a mock if no auth middleware populates user
        const customer = await CustomerModel.findOne();

        if (!customer) {
            res.status(404).json({ message: "Profile not found" });
            return;
        }
        res.json(customer);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
});

export default router;
