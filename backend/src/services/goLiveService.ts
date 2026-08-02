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
import { getBankVerificationState, getPaymentMethodsStatus } from './payments/paymentStatusService.js';
import { isEmailConfigured } from './emailService.js';
import { isSmsTransportConfigured } from './smsService.js';
import {
    getIntegrationVerifications,
    isVerificationExpired,
    type StoredVerification,
} from './integrationVerificationService.js';
import { config } from '../config/index.js';

/**
 * Honest integration states. Credentials existing is NOT proof the
 * integration works — we only ever report `configured_unverified` from
 * config presence. `verified`/`failed` are reserved for future real
 * verification (test sends / provider health calls) and are never emitted
 * from configuration alone.
 */
export type IntegrationState =
    | 'not_configured'
    | 'configured_unverified'
    | 'configured_sandbox_unverified'
    | 'verified'
    | 'verification_expired'
    | 'failed';

function presenceState(configured: boolean): IntegrationState {
    return configured ? 'configured_unverified' : 'not_configured';
}

/**
 * Combine config presence with the owner's recorded verification outcome.
 * Presence is a precondition — a verification record can only upgrade (or
 * fail) a CONFIGURED integration, and success ages into
 * `verification_expired` so a years-old test cannot stay green forever.
 */
function verifiedState(configured: boolean, record: StoredVerification | undefined): IntegrationState {
    if (!configured) return 'not_configured';
    if (!record) return 'configured_unverified';
    if (record.lastResult === 'failed') return 'failed';
    return isVerificationExpired(record.verifiedAt) ? 'verification_expired' : 'verified';
}

export interface StockItemReadiness {
    sku?: string;
    name: string;
    status: 'READY' | 'NO_INVENTORY_ROW' | 'ZERO_AVAILABLE';
}

export async function getGoLiveReadiness() {
    const [txn, invoiceIndex, settings, verifications] = await Promise.all([
        transactionReadiness(),
        invoiceIndexReadiness(),
        Settings.findOne({ key: 'business' }).select('paymentOptions bankVerification').lean(),
        getIntegrationVerifications(),
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
    const bankVerification = getBankVerificationState(settings);

    const greenInvoiceConfigured = Boolean(config.greenInvoice.apiId && config.greenInvoice.secret);

    return {
        database: {
            transactionsReady: txn.ready,
            topology: txn.topology,
            ...(txn.reason ? { reason: txn.reason } : {}),
        },
        criticalIndexes: {
            // Sanitized by indexReadiness itself — stable code + safe hint.
            invoiceOrderUnique: invoiceIndex,
        },
        payments: {
            ...payments,
            // Truthful attestation state: `verified` ONLY while the owner's
            // recorded fingerprint matches the currently saved bank fields —
            // never inferred from non-empty configuration.
            bankVerification: bankVerification.status,
            ...(bankVerification.verifiedAt ? { bankVerifiedAt: bankVerification.verifiedAt } : {}),
        },
        stock: {
            activeProducts: products.length,
            trackedProducts: tracked.length,
            readyProducts: items.length - notReady.length,
            notReady,
            ready: notReady.length === 0,
        },
        // Structured states, derived from the SAME config checks the send
        // paths use (isEmailConfigured/isSmsConfigured). Presence of
        // credentials is never shown as "verified".
        integrations: {
            email: verifiedState(isEmailConfigured(), verifications.operational_email),
            // Customer SMS depends on the TRANSPORT (credentials + sender)
            // only; the admin recipient is a separate concern — a missing
            // admin phone must not report customer SMS as unconfigured.
            // A SUCCESSFUL admin-SMS verification proves the transport too;
            // a failed one only marks the admin-SMS chain, since the fault
            // may be the recipient rather than the transport.
            smsTransport: verifications.admin_sms?.lastResult === 'success'
                ? verifiedState(isSmsTransportConfigured(), verifications.admin_sms)
                : presenceState(isSmsTransportConfigured()),
            adminSmsRecipient: verifiedState(Boolean(config.adminPhone), verifications.admin_sms),
            whatsapp: presenceState(Boolean(config.whatsapp.instanceId && config.whatsapp.token)),
            // Config presence is the precondition; `verified` additionally
            // requires a REAL completed OAuth sign-in recorded by the
            // callback (recordGoogleOauthSuccess) — never presence alone.
            googleOauth: verifiedState(
                Boolean(config.google.clientId && config.google.clientSecret),
                verifications.google_oauth,
            ),
            greenInvoice: greenInvoiceConfigured
                ? (config.greenInvoice.sandbox
                    ? 'configured_sandbox_unverified' as IntegrationState
                    : 'configured_unverified' as IntegrationState)
                : 'not_configured' as IntegrationState,
            errorTracking: 'not_configured' as IntegrationState,
            uptimeAlerts: 'not_configured' as IntegrationState,
        },
        // Sanitized verification trail for the three verifiable
        // integrations: timestamps, outcome and coarse failure category
        // only — never recipients, credentials or provider payloads.
        integrationVerifications: Object.fromEntries(
            Object.entries(verifications).map(([key, record]) => [key, {
                provider: record.provider,
                lastAttemptAt: record.lastAttemptAt,
                lastResult: record.lastResult,
                ...(record.failureCategory ? { failureCategory: record.failureCategory } : {}),
                ...(record.verifiedAt ? { verifiedAt: record.verifiedAt } : {}),
            }]),
        ),
        // These live in GitHub Actions: the app has no evidence about the
        // latest run, so they are explicitly manual-check items — structured
        // codes the frontend translates, never English prose from here.
        operations: {
            backups: {
                source: 'github_actions',
                workflow: 'database-backup.yml',
                status: 'external_manual_check_required',
            },
            uptimeMonitor: {
                source: 'github_actions',
                workflow: 'uptime-monitor.yml',
                status: 'external_manual_check_required',
            },
        },
        checkedAt: new Date().toISOString(),
    };
}
