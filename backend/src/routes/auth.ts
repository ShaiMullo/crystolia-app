
import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { CustomerModel } from '../models/Customer.js';
import bcrypt from 'bcrypt';

import passport from 'passport';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Google OAuth
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed', session: false }),
    (req: Request, res: Response) => {
        console.log("🔹 Google Callback Route Hit");
        // Successful authentication
        const user = req.user as any;
        console.log("User authenticated:", user._id);

        const token = "mock_jwt_token_" + user._id; // Replace with real JWT signing

        // Redirect to frontend with token
        // In production, use a secure cookie or a dedicated frontend callback page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const profilePic = encodeURIComponent(user.profilePicture || '');
        const redirectUrl = `${frontendUrl}/he/auth/callback?token=${token}&userId=${user._id}&role=${user.role}&firstName=${user.firstName}&lastName=${user.lastName}&profilePicture=${profilePic}`;

        console.log("Redirecting to:", redirectUrl);
        res.redirect(redirectUrl);
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Apple OAuth (Placeholder)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Apple requires POST for some callbacks
router.post('/apple/callback', (req, res) => {
    res.send("Apple Sign-In Not Implemented Yet (Requires Keys)");
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName, phone, role } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create User
        const newUser = new UserModel({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: role || 'customer'
        });

        await newUser.save();

        // If customer, create customer profile automatically
        if (newUser.role === 'customer') {
            const newCustomer = new CustomerModel({
                businessName: `${firstName} ${lastName}`, // Default business name
                contactPerson: `${firstName} ${lastName}`,
                email: email,
                phone: phone || '',
                user: newUser._id
            });
            await newCustomer.save();

            // Send Welcome SMS
            try {
                const { sendWelcomeSMS } = await import('../services/smsService.js');
                await sendWelcomeSMS(phone, firstName);
            } catch (smsError) {
                console.error("Failed to send welcome SMS:", smsError);
                // Don't block registration if SMS fails
            }
        }

        // Mock Token (Replace with real JWT in production)
        const token = "mock_jwt_token_" + newUser._id;

        res.status(201).json({
            access_token: token,
            user: {
                _id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            }
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await UserModel.findOne({ email });

        if (!user || !user.password) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        // Compare password with hash
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        // Mock Token
        const token = "mock_jwt_token_" + user._id;

        res.json({
            access_token: token,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
