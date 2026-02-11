import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
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
