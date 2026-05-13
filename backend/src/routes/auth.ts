// ===============================================
// 🔑 Auth Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { protect } from '../middleware/auth.js';
import { AppError } from '../utils/validation.js';
import { config } from '../config/index.js';
import passport from 'passport';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/google
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/google/callback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${config.frontendUrl}/en/login?error=google_auth_failed` }),
    async (req: Request, res: Response) => {
        try {
            const user = req.user as any;

            // Check if user has company
            const hasCompany = !!user.company;

            // Generate Token
            const token = signToken(user._id, user.role);

            // Set Cookie
            const cookieOptions = {
                expires: new Date(Date.now() + config.cookieExpiresIn * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: config.secureCookie,
                sameSite: 'lax' as const,
                domain: config.cookieDomain,
                path: '/'
            };

            res.cookie('auth_token', token, cookieOptions);

            // Redirect Logic
            if (hasCompany) {
                // Existing user with company -> Dashboard
                res.redirect(`${config.frontendUrl}/en/dashboard`);
            } else {
                // New user / Missing company -> Onboarding
                res.redirect(`${config.frontendUrl}/en/onboarding`);
            }
        } catch (error) {
            console.error('Google Callback Error:', error);
            res.redirect(`${config.frontendUrl}/en/login?error=server_error`);
        }
    }
);

const { jwtSecret, jwtExpiresIn, cookieExpiresIn } = config;

// Helper to sign JWT
const signToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, jwtSecret, {
        expiresIn: jwtExpiresIn,
    });
};

// Helper to send token response
const createSendToken = (user: any, statusCode: number, res: Response) => {
    const token = signToken(user._id, user.role);

    // 🚀 SECURITY: Cookie Options
    // Must match frontend expectation exactly.
    const cookieOptions = {
        expires: new Date(Date.now() + cookieExpiresIn * 24 * 60 * 60 * 1000),
        httpOnly: true,                 // Prevents XSS attacks
        secure: config.secureCookie,    // True in Prod, False in Dev
        sameSite: 'lax' as const,       // Lax for same-origin (via proxy)
        domain: config.cookieDomain,    // Optional: .crystolia.com
        path: '/'                       // Available across entire app
    };

    res.cookie('auth_token', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        success: true,
        user,
    });
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/auth/register (Public - Customer Only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, companyName, phone } = req.body;

        if (!email || !password || !name || !companyName) {
            return next(new AppError('Please provide name, email, password and company name', 400));
        }

        // 1. Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError('Email already exists', 400));
        }

        // 2. Handle Company Logic
        let companyId;
        let isOwner = false;

        const existingCompany = await Company.findOne({ name: companyName });

        if (existingCompany) {
            // Join existing company
            companyId = existingCompany._id;
            isOwner = false; // Not the first user
        } else {
            // Create new company
            const newCompany = await Company.create({
                name: companyName,
                // Optional fields if provided
                phone: phone || undefined,
            });
            companyId = newCompany._id;
            isOwner = true; // First user is owner
        }

        // 3. Create user with FORCED role 'customer' and Company link
        const newUser = await User.create({
            name,
            email,
            password,
            role: 'customer', // STRICT ENFORCEMENT
            company: companyId,
            isCompanyOwner: isOwner,
            isActive: true
        });

        // 4. Send token
        createSendToken(newUser, 201, res);
    } catch (error) {
        next(error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/auth/login
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // 1. Check if email and password exist
        if (!email || !password) {
            return next(new AppError('Please provide email and password', 400));
        }

        // 2. Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return next(new AppError('Incorrect email or password', 401));
        }

        // 3. Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // 4. Send token
        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/me
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/me', protect, (req: Request, res: Response, next: NextFunction) => {
    // protect middleware already verifies JWT expiration
    res.status(200).json({
        success: true,
        user: req.user,
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/auth/logout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/logout', (req: Request, res: Response) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: config.secureCookie,
        sameSite: 'lax' as const,
        domain: config.cookieDomain,
        path: '/'
    };

    res.cookie('auth_token', 'loggedout', cookieOptions);
    res.status(200).json({ status: 'success' });
});

export default router;
