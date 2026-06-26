// ===============================================
// 🙋 /api/v1/me — Customer Portal (self-service) Routes
// ===============================================
// The authenticated customer's OWN resources. These are additive aliases that
// reuse the EXACT same handler functions as the legacy /api/customers/* and
// customer-facing /api/orders routes — same logic, same response shapes, no
// drift. The legacy routes stay mounted and unchanged (see routes/customers.ts,
// routes/orders.ts). See docs/b4-customer-facing-v1-plan.md.
//
// Note: /api/v1/customers and /api/v1/orders remain the ADMIN CRM routers
// (routes/crmCustomers.ts / routes/crmOrders.ts) — this /me namespace is the
// separate customer-facing surface and does not touch them.

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getMyProfile, completeProfile, updateProfile } from './customers.js';
import { placeOrder, listOrders } from './orders.js';

const router = Router();

// Protect ALL routes (same as the legacy routers).
router.use(protect);

// ── Customer profile (self-service) ──────────────────────────────────────────
router.get('/profile', authorize('customer'), getMyProfile);            // ← GET /api/customers/my-profile
router.post('/profile/complete', authorize('customer'), completeProfile); // ← POST /api/customers/complete-profile
router.patch('/profile', authorize('customer'), updateProfile);         // ← PATCH /api/customers/update-profile

// ── Customer orders (own only) ───────────────────────────────────────────────
// listOrders is role-aware; gating to 'customer' keeps /me/orders scoped to the
// caller's own company (POST mirrors the legacy customer-only placement).
router.post('/orders', authorize('customer'), placeOrder);              // ← POST /api/orders
router.get('/orders', authorize('customer'), listOrders);               // ← GET /api/orders (customer-scoped)

export default router;
