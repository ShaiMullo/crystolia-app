// ===============================================
// 🛑 Rate Limiting Middleware
// ===============================================

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    max: number;      // Max requests per window
    message?: string;
}

/**
 * Basic in-memory rate limiter
 * For production with multiple instances, use Redis (e.g., rate-limit-redis)
 */
export function rateLimit(options: RateLimitOptions) {
    const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();

        if (!store[ip]) {
            store[ip] = {
                count: 0,
                resetTime: now + windowMs,
            };
        }

        const record = store[ip];

        // Reset if window passed
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }

        record.count++;

        if (record.count > max) {
            res.status(429).json({
                success: false,
                error: message,
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            });
            return;
        }

        next();
    };
}

/**
 * Clears every rate-limit bucket. Exposed for the admin-only system endpoint so
 * operational tooling (e.g. the smoke suite, which deliberately exhausts the
 * lead budget to prove the 429 path) can restore a clean state — the store is
 * in-memory and otherwise only resets when the window expires or the process
 * restarts.
 */
export function resetRateLimitStore(): void {
    for (const key of Object.keys(store)) {
        delete store[key];
    }
}

// Clean up store periodically to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const ip in store) {
        if (store[ip].resetTime < now) {
            delete store[ip];
        }
    }
}, 60000); // Cleanup every minute
