import rateLimit from 'express-rate-limit';

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
