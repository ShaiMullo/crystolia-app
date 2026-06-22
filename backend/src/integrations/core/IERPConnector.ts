// ===============================================
// 🔌 IERPConnector — the generic ERP contract
// ===============================================
// THIS is the seam that makes Comax "just one implementation". Every ERP the
// platform ever supports implements this interface and nothing else in the
// codebase needs to know which ERP it is talking to.
//
// Interface only — no implementation, no I/O, no endpoints.

import type { HealthStatus, SyncContext, SyncResult } from './syncTypes.js';
import type { ERPProviderId } from '../types/erp.js';

export interface IERPConnector {
    /** Stable provider id, e.g. 'comax'. */
    readonly provider: ERPProviderId;

    // ---- lifecycle ----
    /** Establish a session (auth/handshake). Implementation-defined. */
    connect(): Promise<void>;
    /** Tear down the session / release resources. */
    disconnect(): Promise<void>;
    /** Lightweight reachability + auth probe. Safe to call often. */
    healthCheck(): Promise<HealthStatus>;

    // ---- sync operations (one per domain entity) ----
    syncProducts(ctx: SyncContext): Promise<SyncResult>;
    syncCustomers(ctx: SyncContext): Promise<SyncResult>;
    syncInventory(ctx: SyncContext): Promise<SyncResult>;
    syncOrders(ctx: SyncContext): Promise<SyncResult>;
    syncInvoices(ctx: SyncContext): Promise<SyncResult>;
    syncSuppliers(ctx: SyncContext): Promise<SyncResult>;
    syncPriceLists(ctx: SyncContext): Promise<SyncResult>;
    syncWarehouses(ctx: SyncContext): Promise<SyncResult>;
}
