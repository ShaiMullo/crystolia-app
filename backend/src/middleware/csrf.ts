import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/validation.js';
import { config } from '../config/index.js';

/**
 * Pure helper: is `source` (an Origin or Referer header value) one of the
 * allowed origins, compared by EXACT origin?
 *
 * Both the incoming value and each allow-list entry are parsed with the URL
 * API and compared on their `.origin` (scheme + host + port). This prevents the
 * prefix-match bypass that `String.startsWith` allowed — e.g.
 *   isAllowedOrigin('https://admin.crystolia.com.evil.com', ['https://admin.crystolia.com'])
 * returns false (the origins differ), whereas `startsWith` would have passed it.
 *
 * Malformed/unparseable values and the opaque origin `"null"` are rejected.
 */
export function isAllowedOrigin(
    source: string | undefined,
    allowedOrigins: string[],
): boolean {
    if (!source) return false;

    let sourceOrigin: string;
    try {
        sourceOrigin = new URL(source).origin;
    } catch {
        return false; // malformed Origin/Referer → reject
    }
    // `new URL('null')` throws, but a Referer like 'null' or sandboxed opaque
    // origins can surface as the literal string 'null' — never trust them.
    if (sourceOrigin === 'null') return false;

    return allowedOrigins.some((allowed) => {
        try {
            return new URL(allowed).origin === sourceOrigin;
        } catch {
            return false; // ignore any misconfigured allow-list entry
        }
    });
}

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

    // Check that the source's EXACT origin is permitted (no prefix matching).
    const isAllowed = isAllowedOrigin(source, config.corsOrigins);

    if (!isAllowed) {
        console.warn(`[CSRF] Blocked request from unauthorized source: ${source}`);
        return next(new AppError('CSRF: Unauthorized Origin', 403));
    }

    next();
};
