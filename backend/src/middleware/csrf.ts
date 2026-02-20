import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/validation.js';
import { config } from '../config/index.js';

/**
 * 🛡️ CSRF Protection via Origin Verification
 * 
 * Since we use SameSite: Lax cookies, simple GET CSRF is blocked.
 * For POST/PUT/DELETE/PATCH, we must verify that the request comes from
 * our own trusted origins (admin or app).
 */
export const csrfCheck = (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // In production, Origin is usually present for CORS requests.
    // However, some non-browser clients might not send it. 
    // We strictly enforce it for browser-based state changes.

    if (!origin && !referer) {
        // Strict mode: Fail if no origin/referer
        // But allow if it's a server-to-server call (e.g. webhook) WITH a special header?
        // For now, assume strict browser security.
        return next(new AppError('CSRF: Missing Origin or Referer header', 403));
    }

    const source = origin || referer || '';

    // Check if source matches permitted origins
    const isAllowed = config.corsOrigins.some(allowed => source.startsWith(allowed));

    if (!isAllowed) {
        console.warn(`[CSRF] Blocked request from unauthorized source: ${source}`);
        return next(new AppError('CSRF: Unauthorized Origin', 403));
    }

    next();
};
