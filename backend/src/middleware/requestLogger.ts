// ===============================================
// 📋 Structured Request Logger Middleware
// ===============================================
// Emits one JSON log line per HTTP request on res.finish.
// Loki scrapes these from stdout and indexes them for alerting.
//
// Log fields:
//   ts           - ISO timestamp
//   level        - info | warn | error (mirrors HTTP status tier)
//   type         - always "http" (filter in Loki: | json | type="http")
//   method       - HTTP verb
//   path         - req.path (excludes query string)
//   status       - HTTP status code (integer)
//   duration_ms  - response time in ms (integer)
//   request_id   - UUID per request (for tracing correlated log lines)
//   user_id      - MongoDB user _id when authenticated (omitted otherwise)
//   ip           - client IP (trust proxy enabled, so X-Forwarded-For applies)
//
// Health check paths are skipped to suppress Kubernetes probe noise.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request so downstream handlers can reference the request ID.
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

// Kubernetes liveness/readiness probes — suppress from logs.
const SKIP_PATHS = new Set(['/api/health', '/api/ready', '/api/live']);

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    if (SKIP_PATHS.has(req.path)) {
        return next();
    }

    const requestId = randomUUID();
    const startMs = Date.now();

    // Attach so downstream handlers (error handler, route handlers) can include it.
    req.requestId = requestId;

    res.on('finish', () => {
        const status = res.statusCode;
        const duration_ms = Date.now() - startMs;
        const userId = (req.user as any)?._id?.toString();

        const entry: Record<string, unknown> = {
            ts: new Date().toISOString(),
            level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
            type: 'http',
            method: req.method,
            path: req.path,
            status,
            duration_ms,
            request_id: requestId,
            ip: req.ip,
        };

        // Only include user_id when present — omitting undefined keys keeps logs clean.
        if (userId) entry.user_id = userId;

        const line = JSON.stringify(entry);

        if (status >= 500) {
            console.error(line);
        } else {
            console.log(line);
        }
    });

    next();
}
