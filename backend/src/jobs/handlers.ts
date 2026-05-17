// ===============================================
// 🛠️ Job Handlers
// ===============================================
// The actual work for each seeded job. Handlers are pure async
// functions returning an optional summary; jobRunner records telemetry.

import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import { reconcileInventory } from '../services/reconciliationService.js';
import { createNotification } from '../services/notificationService.js';
import type { JobHandler } from './jobRunner.js';

const STALE_LEAD_DAYS = 14;

async function adminRecipientIds(): Promise<string[]> {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    return admins.map((a) => a._id.toString());
}

async function notifyAdmins(input: { title: string; body: string; link: string; icon: string }): Promise<number> {
    const recipients = await adminRecipientIds();
    for (const recipientId of recipients) {
        // eslint-disable-next-line no-await-in-loop
        await createNotification({
            recipientId,
            type: 'automation_triggered',
            title: input.title,
            body: input.body,
            link: input.link,
            icon: input.icon,
        });
    }
    return recipients.length;
}

// ── nightly inventory reconciliation ─────────────────────────────────────────
const nightlyReconciliation: JobHandler = async () => {
    const result = await reconcileInventory(true);
    const issues =
        result.discrepancies.length + result.negativeStock.length + result.invoicePaymentMismatches.length;
    if (issues > 0) {
        await notifyAdmins({
            title: `Nightly reconciliation: ${issues} issues`,
            body: result.fixed ? 'Discrepancies were auto-fixed.' : 'Review required.',
            link: '/admin/system',
            icon: 'RefreshCw',
        });
    }
    return {
        discrepancies: result.discrepancies.length,
        negativeStock: result.negativeStock.length,
        mismatches: result.invoicePaymentMismatches.length,
        fixed: result.fixed,
    };
};

// ── overdue invoice reminders ────────────────────────────────────────────────
const overdueInvoiceReminders: JobHandler = async () => {
    const now = new Date();
    const overdue = await Invoice.find({
        status: { $ne: 'cancelled' },
        paymentStatus: { $ne: 'paid' },
        dueDate: { $lt: now },
    }).select('invoiceNumber totalAmount amountPaid').lean();

    if (overdue.length > 0) {
        const outstanding = overdue.reduce((s, i) => s + (i.totalAmount - (i.amountPaid || 0)), 0);
        await notifyAdmins({
            title: `${overdue.length} overdue invoices`,
            body: `Total outstanding: ${Math.round(outstanding)}.`,
            link: '/admin/payments',
            icon: 'FileWarning',
        });
    }
    return { overdueCount: overdue.length };
};

// ── low-stock digest ─────────────────────────────────────────────────────────
const lowStockDigest: JobHandler = async () => {
    const rows = await Inventory.find({}).populate('product', 'name isDeleted stockTrackingEnabled').lean();
    const low = rows.filter((r) => {
        const product = r.product as unknown as { isDeleted?: boolean; stockTrackingEnabled?: boolean } | null;
        if (!product || product.isDeleted || product.stockTrackingEnabled === false) return false;
        return (r.minimumQuantity || 0) > 0 && (r.quantity - r.reservedQuantity) <= r.minimumQuantity;
    });
    if (low.length > 0) {
        await notifyAdmins({
            title: `${low.length} products low on stock`,
            body: 'Review inventory and consider purchase orders.',
            link: '/admin/inventory',
            icon: 'AlertTriangle',
        });
    }
    return { lowStockCount: low.length };
};

// ── stale leads reminder ─────────────────────────────────────────────────────
const staleLeadsReminder: JobHandler = async () => {
    const cutoff = new Date(Date.now() - STALE_LEAD_DAYS * 24 * 3600 * 1000);
    const stale = await Lead.countDocuments({
        isDeleted: false,
        status: { $in: ['new', 'contacted', 'qualified', 'proposal'] },
        lastContactAt: { $lt: cutoff },
    });
    if (stale > 0) {
        await notifyAdmins({
            title: `${stale} stale leads`,
            body: `Leads with no contact for ${STALE_LEAD_DAYS}+ days.`,
            link: '/admin/pipeline',
            icon: 'Inbox',
        });
    }
    return { staleLeadCount: stale };
};

// ── unpaid invoices escalation ───────────────────────────────────────────────
const unpaidInvoicesEscalation: JobHandler = async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const escalated = await Invoice.countDocuments({
        status: { $ne: 'cancelled' },
        paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] },
        issuedAt: { $lt: cutoff },
    });
    if (escalated > 0) {
        await notifyAdmins({
            title: `${escalated} invoices unpaid 30+ days`,
            body: 'These invoices may need escalation.',
            link: '/admin/payments',
            icon: 'AlertTriangle',
        });
    }
    return { escalatedCount: escalated };
};

export const JOB_HANDLERS: Record<string, JobHandler> = {
    nightly_reconciliation: nightlyReconciliation,
    overdue_invoice_reminders: overdueInvoiceReminders,
    low_stock_digest: lowStockDigest,
    stale_leads_reminder: staleLeadsReminder,
    unpaid_invoices_escalation: unpaidInvoicesEscalation,
};
