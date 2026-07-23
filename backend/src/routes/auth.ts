// ===============================================
// 🔑 Auth Routes
// ===============================================

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { protect } from '../middleware/auth.js';
import { AppError, validate } from '../utils/validation.js';
import { config } from '../config/index.js';
import passport from 'passport';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logAudit } from '../services/auditService.js';
import {
    isEmailConfigured,
    sendRegistrationExistingAccountEmail,
    type EmailLocale,
} from '../services/emailService.js';
import {
    notifyAdminOfRegistration,
    sendRegistrationEmail,
} from '../services/registrationNotificationService.js';
import {
    isSupportedCountry,
    isValidCompanyNumber,
    normalizeCompanyNumber,
} from '../utils/countries.js';

const router = Router();

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
// Google OAuth — short-lived signed tokens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Two purpose-scoped JWTs ride in httpOnly cookies during the flow. Neither
// carries an `id` claim, so neither can ever be replayed as an auth_token
// (the `protect` middleware resolves decoded.id and rejects when absent).

type AppLocale = 'he' | 'en' | 'ru';

interface OauthStatePayload {
    purpose: 'google_oauth_state';
    nonce: string;
    locale: AppLocale;
}

interface RegistrationTicketPayload {
    purpose: 'google_registration';
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
    locale: AppLocale;
}

const OAUTH_STATE_COOKIE = 'g_oauth_state';
const REGISTRATION_TICKET_COOKIE = 'g_reg_ticket';

function shortLivedCookieOptions(maxAgeMs: number) {
    return {
        maxAge: maxAgeMs,
        httpOnly: true,
        secure: config.secureCookie,
        sameSite: 'lax' as const,
        path: '/api',
    };
}

function safeAppLocale(value: unknown): AppLocale {
    return value === 'en' || value === 'ru' ? value : 'he';
}

function authPageUrl(locale: AppLocale, query: string): string {
    return `${config.frontendUrl.replace(/\/$/, '')}/${locale}/auth?${query}`;
}

function isGoogleConfigured(): boolean {
    return Boolean(config.google.clientId && config.google.clientSecret && config.google.callbackUrl);
}

function isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error
        && (error as { code?: number }).code === 11000;
}

// Public feature discovery lets the UI avoid offering OAuth before the
// production credentials exist. It exposes capability booleans only.
router.get('/capabilities', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            google: isGoogleConfigured(),
            registrationEmail: isEmailConfigured(),
        },
    });
});

function verifyPurposeToken<T extends { purpose: string }>(
    token: string | undefined,
    purpose: T['purpose'],
): T | null {
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, jwtSecret) as T;
        return decoded.purpose === purpose ? decoded : null;
    } catch {
        return null;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/google?locale=he|en|ru
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Issues a CSRF `state` nonce (round-tripped through Google) bound to a
// signed httpOnly cookie, which also carries the caller's locale.
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
    const locale = safeAppLocale(req.query.locale);
    if (!isGoogleConfigured()) {
        res.redirect(authPageUrl(locale, 'error=google_unavailable'));
        return;
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload: OauthStatePayload = { purpose: 'google_oauth_state', nonce, locale };
    const stateToken = jwt.sign(statePayload, jwtSecret, { expiresIn: '10m' });
    res.cookie(OAUTH_STATE_COOKIE, stateToken, shortLivedCookieOptions(10 * 60 * 1000));

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state: nonce,
    } as any)(req, res, next);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/google/callback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get(
    '/google/callback',
    (req: Request, res: Response, next: NextFunction) => {
        if (!isGoogleConfigured()) {
            res.redirect(authPageUrl(safeAppLocale(req.query.locale), 'error=google_unavailable'));
            return;
        }
        next();
    },
    // Verify our own CSRF state BEFORE exchanging the authorization code.
    (req: Request, res: Response, next: NextFunction) => {
        const statePayload = verifyPurposeToken<OauthStatePayload>(
            req.cookies?.[OAUTH_STATE_COOKIE],
            'google_oauth_state',
        );
        res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api' });

        if (!statePayload || statePayload.nonce !== req.query.state) {
            res.redirect(authPageUrl('he', 'error=google_auth_failed'));
            return;
        }
        (req as any).oauthLocale = statePayload.locale;
        next();
    },
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${config.frontendUrl.replace(/\/$/, '')}/he/auth?error=google_auth_failed`,
    }),
    async (req: Request, res: Response) => {
        const locale: AppLocale = safeAppLocale((req as any).oauthLocale);
        try {
            const { profile } = req.user as unknown as { profile: any };

            const email: string | undefined = profile?.emails?.[0]?.value?.toLowerCase();
            const emailVerified =
                profile?._json?.email_verified === true || profile?._json?.email_verified === 'true';

            // Only verified Google emails may enter the flow — an unverified
            // address could be used to squat someone else's mailbox.
            if (!email || !emailVerified || !profile?.id) {
                res.redirect(authPageUrl(locale, 'error=google_auth_failed'));
                return;
            }

            const existingByGoogleId = await User.findOne({ googleId: profile.id });
            const existingByEmail = existingByGoogleId ?? (await User.findOne({ email }));

            if (existingByEmail) {
                const user = existingByEmail;

                // Never silently attach a Google identity to a password
                // account that merely shares the email address.
                if (!existingByGoogleId) {
                    res.redirect(authPageUrl(locale, 'error=account_exists'));
                    return;
                }

                // Keep failure responses generic — they must not reveal
                // whether an account is deleted, rejected or deactivated.
                if (user.isDeleted || user.registrationStatus === 'rejected') {
                    res.redirect(authPageUrl(locale, 'error=account_unavailable'));
                    return;
                }
                if (user.registrationStatus === 'pending' || !user.isActive) {
                    res.redirect(authPageUrl(locale, 'status=pending'));
                    return;
                }

                const token = signToken(String(user._id), user.role, user.tokenVersion ?? 0);
                res.cookie('auth_token', token, {
                    expires: new Date(Date.now() + config.cookieExpiresIn * 24 * 60 * 60 * 1000),
                    httpOnly: true,
                    secure: config.secureCookie,
                    sameSite: 'lax' as const,
                    domain: config.cookieDomain,
                    path: '/',
                });
                user.lastLogin = new Date();
                await user.save({ validateBeforeSave: false });

                const target = user.preferredLocale || locale;
                res.redirect(`${config.frontendUrl.replace(/\/$/, '')}/${target}/dashboard`);
                return;
            }

            // New Google identity: do NOT create a partial pending user yet.
            // Hand out a short-lived registration ticket and collect the
            // business details first; the pending request is created only when
            // the completion form is submitted.
            const ticket: RegistrationTicketPayload = {
                purpose: 'google_registration',
                googleId: String(profile.id),
                email,
                name: typeof profile.displayName === 'string' ? profile.displayName.slice(0, 120) : '',
                avatar: profile.photos?.[0]?.value,
                locale,
            };
            const ticketToken = jwt.sign(ticket, jwtSecret, { expiresIn: '30m' });
            res.cookie(REGISTRATION_TICKET_COOKIE, ticketToken, shortLivedCookieOptions(30 * 60 * 1000));
            res.redirect(`${config.frontendUrl.replace(/\/$/, '')}/${locale}/auth/complete-registration`);
        } catch (error) {
            console.error('Google Callback Error:', error instanceof Error ? error.message : 'unknown');
            res.redirect(authPageUrl(locale, 'error=google_auth_failed'));
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/auth/google/registration-context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lets the completion page display the verified Google identity. Requires a
// valid registration ticket; grants no access to anything else.
router.get('/google/registration-context', (req: Request, res: Response) => {
    const ticket = verifyPurposeToken<RegistrationTicketPayload>(
        req.cookies?.[REGISTRATION_TICKET_COOKIE],
        'google_registration',
    );
    if (!ticket) {
        res.status(401).json({ success: false, error: 'Registration session expired' });
        return;
    }
    res.json({ success: true, data: { email: ticket.email, name: ticket.name, locale: ticket.locale } });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/auth/google/complete-registration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/google/complete-registration', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ticket = verifyPurposeToken<RegistrationTicketPayload>(
            req.cookies?.[REGISTRATION_TICKET_COOKIE],
            'google_registration',
        );
        if (!ticket) {
            return next(new AppError('Registration session expired', 401));
        }

        const text = (value: unknown, max: number): string =>
            typeof value === 'string' ? value.trim().slice(0, max) : '';
        const name = text(req.body.name, 120) || ticket.name;
        const companyName = text(req.body.companyName, 160);
        const phone = text(req.body.phone, 32);
        const country = text(req.body.country, 2).toUpperCase();
        const vatNumber = normalizeCompanyNumber(country, text(req.body.vatNumber, 32));
        const locale = safeAppLocale(req.body.locale ?? ticket.locale);

        const validationError = validateRegistrationBusinessFields({ name, companyName, phone, country, vatNumber });
        if (validationError) {
            return next(new AppError(validationError, 400));
        }

        // The ticket holder proved ownership of this email via Google, so a
        // specific conflict answer here is not an enumeration vector.
        const existingUser = await User.findOne({
            $or: [{ email: ticket.email }, { googleId: ticket.googleId }],
        });
        if (existingUser) {
            res.clearCookie(REGISTRATION_TICKET_COOKIE, { path: '/api' });
            return next(new AppError('An account already exists for this email', 409));
        }

        const registrationFlags = await collectDuplicateFlags(companyName, vatNumber);

        const newUser = await User.create({
            name,
            email: ticket.email,
            // Placeholder — the GOOGLE_OAUTH_ prefix bypasses strength rules
            // and the random suffix ensures it can never be guessed/used.
            password: `GOOGLE_OAUTH_${crypto.randomBytes(24).toString('hex')}`,
            role: 'customer',
            phone,
            googleId: ticket.googleId,
            avatar: ticket.avatar,
            isActive: false,
            registrationStatus: 'pending',
            registrationMethod: 'google',
            registrationCompany: { name: companyName, vatNumber, country, phone },
            ...(registrationFlags.length ? { registrationFlags } : {}),
            preferredLocale: locale,
        });

        res.clearCookie(REGISTRATION_TICKET_COOKIE, { path: '/api' });

        // Best-effort notifications — never fail a saved registration.
        const [emailResult] = await Promise.all([
            sendRegistrationEmail(newUser, 'pending', { companyName }),
            notifyAdminOfRegistration(newUser),
        ]);

        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { role: 'customer', registrationStatus: 'pending', registrationMethod: 'google' },
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
// Registration validation helpers (shared password/Google)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function validateRegistrationBusinessFields(fields: {
    name: string;
    companyName: string;
    phone: string;
    country: string;
    vatNumber: string;
}): string | null {
    const { name, companyName, phone, country, vatNumber } = fields;
    if (!name || !companyName || !phone || !country || !vatNumber) {
        return 'Please provide contact name, company name, phone, country and company number';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 9 || phoneDigits.length > 15 || !/^[+0-9()\-.\s]+$/.test(phone)) {
        return 'Please provide a valid phone number';
    }
    if (!isSupportedCountry(country)) {
        return 'Please select a valid country';
    }
    if (!isValidCompanyNumber(country, vatNumber)) {
        return country === 'IL'
            ? 'Please provide a valid company number (8-9 digits)'
            : 'Please provide a valid VAT / Tax ID';
    }
    return null;
}

/**
 * Duplicate ח.פ./VAT or company-name submissions are never rejected outright
 * (that would leak which numbers exist) — they are flagged for manual review
 * on the admin registrations screen instead.
 */
async function collectDuplicateFlags(
    companyName: string,
    vatNumber: string,
    excludeUserId?: unknown,
): Promise<string[]> {
    const flags: string[] = [];
    const pendingVatQuery: Record<string, unknown> = {
        'registrationCompany.vatNumber': vatNumber,
        registrationStatus: 'pending',
    };
    if (excludeUserId) {
        pendingVatQuery._id = { $ne: excludeUserId };
    }
    const [companyByVat, pendingByVat, companyByName] = await Promise.all([
        Company.findOne({ vatNumber }).select('_id').lean(),
        User.findOne(pendingVatQuery).select('_id').lean(),
        Company.findOne({ name: companyName }).select('_id').lean(),
    ]);
    if (companyByVat || pendingByVat) flags.push('possible-duplicate-vat');
    if (companyByName) flags.push('possible-duplicate-name');
    return flags;
}

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
        const country = text(req.body.country, 2).toUpperCase();
        const vatNumber = normalizeCompanyNumber(country, text(req.body.vatNumber, 32));
        const locale: EmailLocale = req.body.locale === 'en' || req.body.locale === 'ru'
            ? req.body.locale
            : 'he';

        if (!email || !password) {
            return next(new AppError('Please provide email and password', 400));
        }
        if (!validate.email(email)) {
            return next(new AppError('Please provide a valid email address', 400));
        }
        const businessFieldsError = validateRegistrationBusinessFields({ name, companyName, phone, country, vatNumber });
        if (businessFieldsError) {
            return next(new AppError(businessFieldsError, 400));
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return next(new AppError('Password must contain at least 8 characters, one uppercase letter and one number', 400));
        }

        // 1. Anti-enumeration: an already-registered email gets the SAME
        // 202 response as a fresh registration. Only the mailbox owner is
        // told (by email) that an account already exists.
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Legacy pending customers created before the complete business
            // registration flow existed have neither a company snapshot nor a
            // registration method. Treat their next valid password submission
            // as completion of the original request instead of silently
            // discarding the newly supplied business details.
            const canCompleteLegacyPending =
                existingUser.role === 'customer'
                && existingUser.registrationStatus === 'pending'
                && !existingUser.isActive
                && !existingUser.isDeleted
                && !existingUser.googleId
                && (!existingUser.registrationMethod || !existingUser.registrationCompany);

            if (canCompleteLegacyPending) {
                const registrationFlags = await collectDuplicateFlags(
                    companyName,
                    vatNumber,
                    existingUser._id,
                );

                existingUser.name = name;
                existingUser.phone = phone;
                existingUser.password = password;
                existingUser.registrationMethod = 'password';
                existingUser.registrationCompany = { name: companyName, vatNumber, country, phone };
                existingUser.registrationFlags = registrationFlags.length ? registrationFlags : undefined;
                existingUser.preferredLocale = locale;
                await existingUser.save();

                const [emailResult] = await Promise.all([
                    sendRegistrationEmail(existingUser, 'pending', { companyName }),
                    notifyAdminOfRegistration(existingUser),
                ]);

                await logAudit({
                    action: 'UPDATE',
                    entity: 'User',
                    entityId: existingUser._id.toString(),
                    req,
                    details: {
                        registrationCompletedFromLegacyPending: true,
                        registrationMethod: 'password',
                    },
                });

                res.status(202).json({
                    success: true,
                    status: 'pending_approval',
                    emailNotificationSent: emailResult.success,
                    message: 'Registration received and awaiting approval',
                });
                return;
            }

            const reminder = await sendRegistrationExistingAccountEmail({
                to: email,
                name: existingUser.name,
                locale,
            });
            res.status(202).json({
                success: true,
                status: 'pending_approval',
                emailNotificationSent: reminder.success,
                message: 'Registration received and awaiting approval',
            });
            return;
        }

        // 2. The Company document is intentionally NOT created here. The
        // submitted business details are stored as a snapshot on the user and
        // the Company is created on admin approval — a public registration
        // must never attach itself to an existing company by name, and
        // duplicate ח.פ./VAT submissions go to manual review instead.
        const registrationFlags = await collectDuplicateFlags(companyName, vatNumber);

        // 3. Create user with FORCED role 'customer'
        const newUser = await User.create({
            name,
            email,
            password,
            role: 'customer', // STRICT ENFORCEMENT
            phone,
            isActive: false,
            registrationStatus: 'pending',
            registrationMethod: 'password',
            registrationCompany: { name: companyName, vatNumber, country, phone },
            ...(registrationFlags.length ? { registrationFlags } : {}),
            preferredLocale: locale,
        });

        // 4. A pending registration never receives a token. Email + admin SMS
        // are best-effort so a provider outage does not lose the request.
        const [emailResult] = await Promise.all([
            sendRegistrationEmail(newUser, 'pending', { companyName }),
            notifyAdminOfRegistration(newUser),
        ]);
        if (!emailResult.success) {
            console.warn('[Registration] Pending email was not delivered:', emailResult.error);
        }

        await logAudit({
            action: 'CREATE',
            entity: 'User',
            entityId: newUser._id.toString(),
            req,
            details: { role: 'customer', registrationStatus: 'pending', registrationMethod: 'password' },
        });

        res.status(202).json({
            success: true,
            status: 'pending_approval',
            emailNotificationSent: emailResult.success,
            message: 'Registration received and awaiting approval',
        });
    } catch (error) {
        // Two simultaneous requests can both pass the pre-check before the
        // unique email index accepts only one. Preserve the same generic 202
        // anti-enumeration response instead of leaking Mongo's duplicate error.
        if (isDuplicateKeyError(error)) {
            const email = typeof req.body?.email === 'string'
                ? req.body.email.trim().slice(0, 254).toLowerCase()
                : '';
            const locale: EmailLocale = req.body?.locale === 'en' || req.body?.locale === 'ru'
                ? req.body.locale
                : 'he';
            const existingUser = email ? await User.findOne({ email }) : null;
            if (existingUser) {
                const reminder = await sendRegistrationExistingAccountEmail({
                    to: email,
                    name: existingUser.name,
                    locale,
                });
                res.status(202).json({
                    success: true,
                    status: 'pending_approval',
                    emailNotificationSent: reminder.success,
                    message: 'Registration received and awaiting approval',
                });
                return;
            }
        }
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
        // Rejected registrations can never sign in. Keep the message generic
        // so it does not reveal the account state.
        if (user.registrationStatus === 'rejected') {
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
