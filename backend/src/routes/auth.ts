// ===============================================
// 🔑 Auth Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { protect } from '../middleware/auth.js';
import { AppError, validate } from '../utils/validation.js';
import { config } from '../config/index.js';
import passport from 'passport';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logAudit } from '../services/auditService.js';
import { sendRegistrationPendingEmail, type EmailLocale } from '../services/emailService.js';

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

            // New Google users also require manual approval. Do not create an
            // auth cookie while the account is pending.
            if (!user.isActive || user.registrationStatus === 'pending') {
                res.redirect(`${config.frontendUrl}/en/auth?status=pending`);
                return;
            }

            // Check if user has company
            const hasCompany = !!user.company;

            // Generate Token
            const token = signToken(user._id, user.role, user.tokenVersion ?? 0);

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

// Helper to sign JWT. `tokenVersion` is embedded so sessions can be invalidated
// on password change / forced logout. Defaults to 0 for safety.
const signToken = (id: string, role: string, tokenVersion: number = 0) => {
    return jwt.sign({ id, role, tokenVersion }, jwtSecret, {
        expiresIn: jwtExpiresIn,
    });
};

// Helper to send token response
const createSendToken = (user: any, statusCode: number, res: Response) => {
    const token = signToken(user._id, user.role, user.tokenVersion ?? 0);

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
        const text = (value: unknown, max: number): string =>
            typeof value === 'string' ? value.trim().slice(0, max) : '';
        const name = text(req.body.name, 120);
        const email = text(req.body.email, 254).toLowerCase();
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const companyName = text(req.body.companyName, 160);
        const phone = text(req.body.phone, 32);
        const locale: EmailLocale = req.body.locale === 'en' || req.body.locale === 'ru'
            ? req.body.locale
            : 'he';

        if (!email || !password || !name || !companyName || !phone) {
            return next(new AppError('Please provide name, email, phone, password and company name', 400));
        }
        if (!validate.email(email)) {
            return next(new AppError('Please provide a valid email address', 400));
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 9 || phoneDigits.length > 15 || !/^[+0-9()\-.\s]+$/.test(phone)) {
            return next(new AppError('Please provide a valid phone number', 400));
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return next(new AppError('Password must contain at least 8 characters, one uppercase letter and one number', 400));
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
                phone,
                email,
                billingEmail: email,
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
            phone,
            isActive: false,
            registrationStatus: 'pending',
            preferredLocale: locale,
        });

        // 4. A pending registration never receives a token. Email delivery is
        // best-effort so a temporary provider outage does not lose the request.
        const emailResult = await sendRegistrationPendingEmail({
            to: newUser.email,
            name: newUser.name,
            companyName,
            locale,
        });
        if (!emailResult.success) {
            console.warn('[Registration] Pending email was not delivered:', emailResult.error);
        }

        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { role: 'customer', registrationStatus: 'pending' },
        });

        res.status(202).json({
            success: true,
            status: 'pending_approval',
            emailNotificationSent: emailResult.success,
            message: 'Registration received and awaiting approval',
        });
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

        // A correct password may reveal the pending state to its owner, but no
        // token is issued until an administrator approves the registration.
        if (user.isDeleted) {
            return next(new AppError('Incorrect email or password', 401));
        }
        if (user.registrationStatus === 'pending') {
            return next(new AppError('Account is awaiting approval', 403));
        }

        // 2b. Deactivated or soft-deleted accounts cannot obtain a token.
        // Keep the message generic so it doesn't reveal account state.
        if (!user.isActive) {
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/auth/change-password (self-service)
// 🔒 Authenticated. Requires the current password.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/change-password', authLimiter, protect, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return next(new AppError('Please provide your current and a new password', 400));
        }

        // Reload WITH the hash (protect's req.user has password de-selected).
        const user = await User.findById(req.user?._id).select('+password');
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // 1. Verify the current password.
        if (!(await user.comparePassword(currentPassword))) {
            return next(new AppError('Current password is incorrect', 401));
        }

        // 2. Reject a no-op change.
        if (currentPassword === newPassword) {
            return next(new AppError('New password must be different from the current password', 400));
        }

        // 3. Set the new password — the schema validator (min length, uppercase,
        //    number) and the pre-save bcrypt hook run on save().
        user.password = newPassword;

        // 4. Invalidate other active sessions that carry a tokenVersion.
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        await user.save();

        // 5. Audit (never record the password/hash).
        await logAudit({
            action: 'UPDATE',
            entity: 'User',
            entityId: user._id.toString(),
            req,
            details: { field: 'password' },
            severity: 'warning',
        });

        // 6. Re-issue the cookie for THIS session (createSendToken strips the
        //    password and returns the user). The new token carries the bumped
        //    tokenVersion so the current session stays valid.
        createSendToken(user, 200, res);
    } catch (error) {
        next(error);
    }
});

export default router;
