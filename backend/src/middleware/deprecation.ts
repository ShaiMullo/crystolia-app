// ===============================================
// ⚠️ Deprecated-Route Signaling Middleware (M1 / B2)
// ===============================================
// Flags a legacy / pre-`/api/v1` mount as deprecated WITHOUT changing its
// behavior. It sets standard deprecation response headers (RFC 8594 `Sunset`,
// RFC 8288 `Link` with rel="successor-version") plus Crystolia-specific hints,
// emits exactly ONE structured warn line per request (no Error, no stack), then
// calls next() so the real router handles the request exactly as before.
//
// Wired only on old paths in index.ts — never on `/api/v1`, auth, or
// health/debug. See docs/m1-consolidation-plan.md (B2).

import { Request, Response, NextFunction } from 'express';
import { opsLogger } from '../utils/opsLogger.js';

// Single platform-wide sunset target for the pre-v1 surface, as an RFC 8594
// HTTP-date. Informational only: nothing is removed on this date — actual
// removal of the legacy/crm aliases is tracked separately (M1 / B4).
export const API_V1_SUNSET = new Date('2026-09-30T23:59:59Z').toUTCString();

const log = opsLogger.forService('api-deprecation');

/**
 * Express middleware factory. Marks the current mount as deprecated in favour of
 * `successor`. `successor` is either a static replacement path (e.g.
 * '/api/v1/customers') or a resolver `(req) => path` for mounts whose successor
 * depends on the subpath — e.g. /api/customers/complete-profile →
 * /api/v1/me/profile/complete vs /api/customers/my-profile → /api/v1/me/profile.
 * Additive only: sets headers + logs one line, then next() — the wrapped router
 * runs unchanged.
 *
 * @param successor canonical replacement path, or a per-request resolver for it
 */
export function deprecatedRoute(successor: string | ((req: Request) => string)) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // req.baseUrl is the mount path of THIS middleware = the deprecated path.
        const deprecatedPath = req.baseUrl || req.path;
        // req.path here is relative to the mount (e.g. '/complete-profile'), so a
        // resolver can map subpaths to distinct successors.
        const target = typeof successor === 'function' ? successor(req) : successor;

        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', API_V1_SUNSET);
        res.setHeader('Link', `<${target}>; rel="successor-version"`);
        res.setHeader('X-Crystolia-Deprecated-Route', deprecatedPath);
        res.setHeader('X-Crystolia-Successor-Route', target);

        // One concise warn line (Loki-friendly); no Error object → no stack trace.
        log.warn('deprecated API route used', {
            method: req.method,
            path: req.originalUrl,
            deprecated: deprecatedPath,
            successor: target,
        });

        next();
    };
}

export default deprecatedRoute;
