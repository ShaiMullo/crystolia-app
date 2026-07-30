// ===============================================
// 💳 Payment provider webhooks — fail-closed mount point
// ===============================================
// No real provider is integrated yet, so every webhook call is rejected
// with 503 and audit-logged. When a provider is added, its adapter's
// verifyWebhook (signature check) runs FIRST, the event id is checked for
// process-once idempotency, and only then is the verified event posted to
// the payment ledger (services/paymentService.ts). Unsigned or unverified
// events must never mutate payment state.

import { Router, Request, Response } from 'express';
import { logAudit } from '../services/auditService.js';

const router = Router();

const KNOWN_PROVIDER_SLUG = /^[a-z0-9-]{1,40}$/;

router.post('/:provider', async (req: Request, res: Response) => {
    const provider = KNOWN_PROVIDER_SLUG.test(req.params.provider) ? req.params.provider : 'invalid';
    await logAudit({
        action: 'WEBHOOK_REJECTED',
        entity: 'Payment',
        entityId: provider,
        req,
        severity: 'warning',
        details: { reason: 'no payment provider configured' },
    }).catch(() => undefined);
    // Fail closed: no provider is configured, so no webhook is trusted.
    res.status(503).json({ success: false, error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' });
});

export default router;
