// ===============================================
// 🧱 Transaction-capability readiness
// ===============================================
// Production inventory/order processing runs inside REQUIRED MongoDB
// transactions (runRequiredTransaction). A deployment that cannot provide
// them (standalone mongod) is therefore NOT production-ready for stock
// mutations — /api/ready must say so, and deploys must fail loudly rather
// than ship a box where every approval/receiving returns 503.
//
// The check is READ-ONLY: topology comes from the `hello` command
// (diagnosticsService) — no probe write is ever performed.

import { getReplicaDiagnostics } from '../services/diagnosticsService.js';

export interface TransactionReadiness {
    ready: boolean;
    topology: string;
    reason?: string;
}

/**
 * Fresh, uncached check — `hello` is cheap and topology problems must be
 * visible immediately to deploy-time readiness polling.
 */
export async function transactionReadiness(): Promise<TransactionReadiness> {
    const diag = await getReplicaDiagnostics();
    if (!diag.connected) {
        return { ready: false, topology: diag.topology, reason: 'Database not connected' };
    }
    if (!diag.transactionsSupported) {
        return {
            ready: false,
            topology: diag.topology,
            reason: `MongoDB topology '${diag.topology}' does not support transactions — `
                + 'production inventory/order processing requires a replica set or mongos '
                + '(see docs/deployment/mongo.md)',
        };
    }
    return { ready: true, topology: diag.topology };
}
