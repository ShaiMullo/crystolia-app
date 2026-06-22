// ===============================================
// 🟦 ComaxConnector — concrete connector STUB
// ===============================================
// Comax is "just one implementation" of the generic IERPConnector. This class
// wires the Comax placeholders (client, mapper, types) into the generic base,
// but implements NO real behaviour:
//   • healthCheck() returns a clearly-disabled status (never a fake "connected")
//   • every sync* method throws "not implemented"
//
// It is NOT registered with ERPFactory and is not imported by the running app,
// so constructing or calling it cannot happen in production today.

import { ERPConnector } from '../core/ERPConnector.js';
import { registerConnector } from '../core/ERPFactory.js';
import type { HealthStatus, SyncContext, SyncResult } from '../core/syncTypes.js';
import type { ConnectorConfig } from '../core/syncTypes.js';
import { ComaxClient } from './client/ComaxClient.js';
import { COMAX_PROVIDER_ID } from './comaxTypes.js';
// comaxMapper is intentionally imported lazily inside sync methods when real
// logic is added; not referenced yet to keep the stub inert.

export class ComaxConnector extends ERPConnector {
    private readonly client: ComaxClient;

    constructor(config: ConnectorConfig) {
        // Force the provider id to Comax regardless of caller input.
        super({ ...config, provider: COMAX_PROVIDER_ID });
        this.client = new ComaxClient({
            baseUrl: config.baseUrl,
            auth: config.auth,
            timeoutMs: config.timeoutMs,
        });
    }

    /**
     * Reports a DISABLED health status. Never claims to be connected because the
     * transport/auth are not implemented and the API surface is UNKNOWN.
     */
    public async healthCheck(): Promise<HealthStatus> {
        const configured = this.client.isConfigured();
        return {
            provider: COMAX_PROVIDER_ID,
            healthy: false,
            state: 'disconnected',
            checkedAt: new Date(),
            message: configured
                ? 'Comax connector present but transport not implemented.'
                : 'Comax connector is a stub — not configured, awaiting official API docs.',
        };
    }

    // ---- sync surface: every method is intentionally unimplemented ----

    public async syncProducts(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncProducts');
    }
    public async syncCustomers(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncCustomers');
    }
    public async syncInventory(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncInventory');
    }
    public async syncOrders(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncOrders');
    }
    public async syncInvoices(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncInvoices');
    }
    public async syncSuppliers(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncSuppliers');
    }
    public async syncPriceLists(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncPriceLists');
    }
    public async syncWarehouses(_ctx: SyncContext): Promise<SyncResult> {
        return this.notImplemented('syncWarehouses');
    }
}

/**
 * Registration helper — registers ComaxConnector with the ERPFactory under the
 * 'comax' provider id. It is exported but **intentionally NOT invoked anywhere**,
 * so Comax stays unregistered/unwired until a real go-live decision is made.
 *
 *   import { registerComaxConnector } from './comax/ComaxConnector.js';
 *   registerComaxConnector(); // call this ONCE, deliberately, when ready
 */
export function registerComaxConnector(): void {
    registerConnector(COMAX_PROVIDER_ID, ComaxConnector);
}
