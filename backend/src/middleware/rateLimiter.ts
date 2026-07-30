import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Max attempts per window per IP. Overridable via env for operational tuning
// and for the automated test suite (which fires many requests from one IP).
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10) || 5;

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: AUTH_RATE_LIMIT_MAX,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        message: "Too many login attempts. Please try again later."
    },
    handler: (req, res, next, options) => {
        console.warn(`[SECURITY] Rate limit triggered for IP: ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    }
});

// Order placement runs authenticated, so the limit is per USER (falling
// back to IP before auth resolves). Generous for a real B2B customer,
// tight enough to stop scripted floods. Env-overridable for ops/tests —
// read lazily so a runtime override takes effect without a restart of the
// module graph (the test suite relies on this).
export const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: () => parseInt(process.env.ORDER_RATE_LIMIT_MAX || '20', 10) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user as { _id?: { toString(): string } } | undefined)?._id?.toString() || ipKeyGenerator(req.ip ?? ''),
    message: {
        message: 'Too many orders submitted. Please try again later.'
    },
    handler: (req, res, next, options) => {
        const who = (req.user as { _id?: { toString(): string } } | undefined)?._id?.toString() ?? req.ip;
        console.warn(`[SECURITY] Order rate limit triggered for user: ${who}`);
        res.status(options.statusCode).json(options.message);
    }
});
