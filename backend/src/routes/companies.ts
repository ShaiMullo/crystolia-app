// ===============================================
// 🏢 Companies Router
// ===============================================
// A lightweight, reusable company directory for admin tooling — user company
// assignment, and (later) CRM / orders / inventory pickers. Read-only for now.

import { Router, Request, Response, NextFunction } from 'express';
import Company from '../models/Company.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/companies - List companies (filters + opt-in pagination)
// 🔒 Protected: Admin Only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Query params (all optional, future-proofed for thousands of companies):
//   search  — case-insensitive match on name
//   active  — 'true' | 'false' filter on isActive
//   page    — 1-based page number  ┐ supplying either switches the response
//   limit   — page size (max 100)  ┘ to { data, pagination }; otherwise a
//                                    plain array is returned (cheap default).
router.get('/', protect, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, active, page, limit } = req.query as Record<string, string | undefined>;

        const query: Record<string, unknown> = {};
        if (active === 'true') query.isActive = true;
        else if (active === 'false') query.isActive = false;
        if (search) query.name = new RegExp(escapeRegex(search), 'i');

        const base = Company.find(query).sort({ name: 1 });

        if (page !== undefined || limit !== undefined) {
            const p = Math.max(1, parseInt(page || '1', 10) || 1);
            const l = Math.min(100, Math.max(1, parseInt(limit || '25', 10) || 25));
            const total = await Company.countDocuments(query);
            const companies = await base.skip((p - 1) * l).limit(l).lean();
            return res.json({
                success: true,
                data: companies,
                pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) },
            });
        }

        const companies = await base.lean();
        res.json({ success: true, data: companies });
    } catch (error) {
        next(error);
    }
});

export default router;
