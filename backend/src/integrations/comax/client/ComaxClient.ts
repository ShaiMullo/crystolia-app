// ===============================================
// 🟦 ComaxClient — transport placeholder (NO implementation)
// ===============================================
// This is where the real Comax HTTP/SOAP transport will live once official docs
// exist. Today it implements NOTHING:
//   • no base URL (UNKNOWN)
//   • no endpoints (must not be invented)
//   • no auth (strategy UNKNOWN)
//   • no network calls
//
// Every method throws so that any accidental use fails loudly rather than
// silently pretending to talk to Comax.

import { opsLogger } from '../../../utils/opsLogger.js';
import { COMAX_PROVIDER_ID, type ComaxOptions } from '../comaxTypes.js';
import type { AuthConfig } from '../../core/syncTypes.js';

export interface ComaxClientConfig {
    /** Runtime-injected; UNKNOWN until Comax provides it. Never committed. */
    baseUrl?: string;
    /** Auth strategy UNKNOWN; credentials injected at runtime. */
    auth?: AuthConfig;
    timeoutMs?: number;
    options?: ComaxOptions;
}

export class ComaxNotConfiguredError extends Error {
    constructor(detail: string) {
        super(`[${COMAX_PROVIDER_ID}] ${detail} — awaiting official Comax API documentation.`);
        this.name = 'ComaxNotConfiguredError';
    }
}

export class ComaxClient {
    private readonly logger = opsLogger.forService('erp:comax:client');
    private readonly config: ComaxClientConfig;

    constructor(config: ComaxClientConfig = {}) {
        this.config = config;
    }

    /**
     * Placeholder for a generic request. Intentionally NOT implemented — there
     * is no verified endpoint, method, or auth scheme to call.
     */
    public async request<T = unknown>(_operation: string, _params?: unknown): Promise<T> {
        this.logger.warn('ComaxClient.request called but transport is not implemented');
        throw new ComaxNotConfiguredError('HTTP/SOAP transport is not implemented');
    }

    /** Whether enough config exists to even attempt a connection. Always false today. */
    public isConfigured(): boolean {
        // Returns false because the auth scheme and base URL are UNKNOWN; this is
        // deliberate so health checks report "disabled", never a fake "connected".
        return false;
    }
}
