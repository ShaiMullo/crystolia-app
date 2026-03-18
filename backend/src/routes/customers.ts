// ===============================================
// 👤 Customers Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { AppError } from '../utils/validation.js';

const router = Router();

// Protect ALL routes
router.use(protect);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/customers/my-profile (Customer Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/my-profile', authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // req.user is already attached by protect, but we need to populate company
        // to get the name.
        const user = await User.findById(req.user?._id).populate('company');

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        const company = user.company as any; // Cast to access populated fields

        res.status(200).json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                companyName: company ? company.name : null,
                isCompanyOwner: user.isCompanyOwner
            }
        });
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/customers/complete-profile (Onboarding)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/complete-profile', authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        const { companyName, vatNumber, phone, address, city } = req.body;

        // 1. Validation
        if (!companyName || !vatNumber || !address || !city) {
            return next(new AppError('Missing required fields', 400));
        }

        // 2. Prevent overwrite if already has company
        if (user.company) {
            return next(new AppError('User already has a company', 409));
        }

        // 3. Create Company
        // Required: name, vatNumber, address, etc
        // Add Company model fields based on schema
        // 3. Create Company
        // Using standard import
        const newCompany = await Company.create({
            name: companyName,
            vatNumber: vatNumber,
            address: address, // Simple string
            city: city,       // Simple string
            phone: phone,
            email: user.email, // Contact email matches user email by default
            owner: user._id,   // Link owner
            status: 'active',
            isActive: true
        });

        // 4. Update User
        await User.findByIdAndUpdate(user._id, {
            company: newCompany._id,
            isCompanyOwner: true,
            phone: phone // Update user phone if provided
        });

        res.status(200).json({
            success: true,
            message: 'Profile completed successfully',
            data: {
                company: newCompany
            }
        });

    } catch (error) {
        // Handle duplicate company name
        if ((error as any).code === 11000) {
            return next(new AppError('Company name already exists', 400));
        }
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATCH /api/customers/update-profile (Customer Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.patch('/update-profile', authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;

        if (!user.company) {
            return next(new AppError('No company found. Complete your profile first.', 404));
        }

        const { companyName, vatNumber, address, city, phone, email } = req.body;

        // Build update object from provided fields only
        const updateFields: Record<string, string> = {};
        if (companyName) updateFields.name = companyName;
        if (vatNumber !== undefined) updateFields.vatNumber = vatNumber;
        if (address !== undefined) updateFields.address = address;
        if (city !== undefined) updateFields.city = city;
        if (phone !== undefined) updateFields.phone = phone;
        if (email !== undefined) updateFields.email = email;

        // user.company is the ObjectId from the verified JWT user — customer can
        // only ever update their own company, never another company's.
        const updatedCompany = await Company.findByIdAndUpdate(
            user.company,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return next(new AppError('Company not found', 404));
        }

        res.status(200).json({
            success: true,
            data: { company: updatedCompany }
        });
    } catch (error) {
        if ((error as any).code === 11000) {
            return next(new AppError('Company name or VAT number already in use', 400));
        }
        next(error);
    }
});

export default router;
