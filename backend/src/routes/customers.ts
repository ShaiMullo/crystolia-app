
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

// POST /api/customers/onboarding - Complete onboarding for new users
router.post('/onboarding', async (req: Request, res: Response) => {
    try {
        const { userId, businessName, businessId, address, city, phone } = req.body;

        if (!businessName || !businessId) {
            res.status(400).json({ message: "Business name and ID are required" });
            return;
        }

        // Check if customer already exists for this user
        let customer = await CustomerModel.findOne({ user: userId });

        if (customer) {
            // Update existing customer
            customer.businessName = businessName;
            customer.businessId = businessId;
            customer.address = address || customer.address;
            customer.city = city || customer.city;
            customer.phone = phone || customer.phone;
            customer.onboardingComplete = true;
            await customer.save();
        } else {
            // Create new customer
            customer = new CustomerModel({
                user: userId,
                businessName,
                businessId,
                address: address || '',
                city: city || '',
                phone: phone || '',
                contactPerson: businessName,
                email: '', // Will be filled from user profile
                onboardingComplete: true
            });
            await customer.save();
        }

        res.status(201).json({ message: "Onboarding complete", customer });
    } catch (error) {
        console.error("Onboarding Error:", error);
        res.status(500).json({ message: "Failed to complete onboarding" });
    }
});

export default router;
