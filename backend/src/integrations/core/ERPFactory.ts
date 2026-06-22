// ===============================================
// 🏭 ERPFactory — connector registry
// ===============================================
// The platform asks the factory for a connector by provider id; it never
// imports a vendor class directly. This is what keeps Comax from being
// hardcoded across the codebase.
//
// Connectors self-register (or are registered at composition time). In this
// sprint NO connector is registered at runtime — Comax registration is added in
// a later checkpoint and is still a non-executing stub.

import type { IERPConnector } from './IERPConnector.js';
import type { ConnectorConfig } from './syncTypes.js';
import type { ERPProviderId } from '../types/erp.js';

export type ERPConnectorConstructor = new (config: ConnectorConfig) => IERPConnector;

const registry = new Map<ERPProviderId, ERPConnectorConstructor>();

/** Register a connector implementation for a provider id. */
export function registerConnector(
    provider: ERPProviderId,
    ctor: ERPConnectorConstructor,
): void {
    if (registry.has(provider)) {
        throw new Error(`ERP connector for '${provider}' is already registered.`);
    }
    registry.set(provider, ctor);
}

/** True if a connector is available for the provider. */
export function isProviderRegistered(provider: ERPProviderId): boolean {
    return registry.has(provider);
}

/** All currently-registered provider ids. */
export function listRegisteredProviders(): ERPProviderId[] {
    return [...registry.keys()];
}

/**
 * Build a connector instance for the requested provider.
 * Throws a clear error if no implementation is registered (the current state
 * for every provider, including Comax, until real integration begins).
 */
export function createConnector(config: ConnectorConfig): IERPConnector {
    const Ctor = registry.get(config.provider);
    if (!Ctor) {
        throw new Error(
            `No ERP connector registered for provider '${config.provider}'. ` +
                `Registered: [${listRegisteredProviders().join(', ') || 'none'}].`,
        );
    }
    return new Ctor(config);
}

/** Test/utility hook — clears the registry. Not used at runtime. */
export function __resetRegistry(): void {
    registry.clear();
}
