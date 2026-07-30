// ===============================================
// 🚦 Go-Live readiness aggregation
// ===============================================
// One admin-facing snapshot answering "can this system run real daily
// business today, and if not — what exactly is missing?". STRICTLY
// secret-free: booleans, counts, SKU/name lists and issue texts only —
// never credentials, URIs, or bank-account values.

import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Settings from '../models/Settings.js';
import { transactionReadiness } from '../db/transactionReadiness.js';
import { invoiceIndexReadiness } from '../db/indexReadiness.js';
import { getPaymentMethodsStatus } from './payments/paymentStatusService.js';
import { config } from '../config/index.js';

export interface StockItemReadiness {
    sku?: string;
    name: string;
    status: 'READY' | 'NO_INVENTORY_ROW' | 'ZERO_AVAILABLE';
}

export async function getGoLiveReadiness() {
    const [txn, invoiceIndex, settings] = await Promise.all([
        transactionReadiness(),
        invoiceIndexReadiness(),
        Settings.findOne({ key: 'business' }).select('paymentOptions').lean(),
    ]);

    // ━━━ Stock readiness: every stock-tracked product needs a MAIN-location
    // row with positive availability before its orders can be approved. ━━━
    const products = await Product.find({ isActive: true, isDeleted: { $ne: true } })
        .select('name sku stockTrackingEnabled')
        .lean();
    const tracked = products.filter((p) => p.stockTrackingEnabled !== false);
    const invRows = await Inventory.find({
        location: 'main',
        product: { $in: tracked.map((p) => p._id) },
    }).select('product quantity reservedQuantity').lean();
    const rowByProduct = new Map(invRows.map((r) => [r.product.toString(), r]));

    const items: StockItemReadiness[] = tracked.map((p) => {
        const row = rowByProduct.get(p._id.toString());
        if (!row) return { sku: p.sku, name: p.name, status: 'NO_INVENTORY_ROW' };
        const available = Math.max(0, (row.quantity || 0) - (row.reservedQuantity || 0));
        return { sku: p.sku, name: p.name, status: available > 0 ? 'READY' : 'ZERO_AVAILABLE' };
    });
    const notReady = items.filter((i) => i.status !== 'READY');

    const payments = getPaymentMethodsStatus(settings?.paymentOptions);

    return {
        database: {
            transactionsReady: txn.ready,
            topology: txn.topology,
            ...(txn.reason ? { reason: txn.reason } : {}),
        },
        criticalIndexes: {
            invoiceOrderUnique: invoiceIndex,
        },
        payments,
        stock: {
            activeProducts: products.length,
            trackedProducts: tracked.length,
            readyProducts: items.length - notReady.length,
            notReady,
            ready: notReady.length === 0,
        },
        // Presence booleans only — never the values themselves.
        integrations: {
            email: Boolean(config.email.fromAddress && (config.email.apiKey || config.sms.accountSid)),
            sms: Boolean(config.sms.accountSid && config.sms.authToken
                && (config.sms.messagingServiceSid || config.sms.fromNumber)),
            whatsapp: Boolean(config.whatsapp.instanceId && config.whatsapp.token),
            googleOauth: Boolean(config.google.clientId && config.google.clientSecret),
            greenInvoice: Boolean(config.greenInvoice.apiId && config.greenInvoice.secret),
            errorTracking: false, // no provider integrated yet (owner decision)
            uptimeAlerts: false,  // uptime monitor runs in GitHub Actions without alerting
        },
        // Operational facts that live outside the app (GitHub Actions) —
        // static descriptors, no tokens available or needed here.
        operations: {
            backups: 'Daily mongodump → S3 (SSE, 35-day retention) with in-pipeline restore test — .github/workflows/database-backup.yml',
            uptimeMonitor: 'Every 5 minutes via GitHub Actions (no alert channel wired yet) — .github/workflows/uptime-monitor.yml',
        },
        checkedAt: new Date().toISOString(),
    };
}
