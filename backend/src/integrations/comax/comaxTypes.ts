// ===============================================
// 🟦 Comax types — placeholder vendor payload shapes
// ===============================================
// ⚠️ EVERY shape here is UNKNOWN / UNVERIFIED. Comax does not publish a public
// API spec (see docs/integrations/comax-research.md). These interfaces exist
// ONLY so the connector/mapper compile and to mark exactly where the real,
// official field names must be filled in later.
//
// NOTHING here is invented as fact: fields are intentionally `unknown` /
// open-ended and must be replaced once an official Comax integration spec is
// obtained. Do not rely on these names — they are scaffolding, not a contract.

/** Provider id constant used across the Comax module. */
export const COMAX_PROVIDER_ID = 'comax' as const;

/**
 * Placeholder for whatever Comax actually returns for an item/product.
 * Real field names UNKNOWN — to be replaced from official docs.
 */
export interface ComaxItemRaw {
    /** UNKNOWN — Comax item identifier field name not verified. */
    [key: string]: unknown;
}

export interface ComaxCustomerRaw {
    /** UNKNOWN — official field names not verified. */
    [key: string]: unknown;
}

export interface ComaxStockRaw {
    /** UNKNOWN — per-branch stock representation not verified. */
    [key: string]: unknown;
}

export interface ComaxOrderRaw {
    /** UNKNOWN — order/document representation not verified. */
    [key: string]: unknown;
}

export interface ComaxDocumentRaw {
    /** UNKNOWN — invoice/document representation not verified. */
    [key: string]: unknown;
}

export interface ComaxSupplierRaw {
    /** UNKNOWN — supplier representation not verified. */
    [key: string]: unknown;
}

export interface ComaxPriceListRaw {
    /** UNKNOWN — price list representation not verified. */
    [key: string]: unknown;
}

export interface ComaxBranchRaw {
    /** UNKNOWN — branch/store representation not verified. */
    [key: string]: unknown;
}

/**
 * Comax-specific connector options. None are required and none ship with a
 * value — credentials/base URL are injected at runtime from env/secret store.
 * The auth STRATEGY itself is UNKNOWN until Comax confirms it.
 */
export interface ComaxOptions {
    /** UNKNOWN — placeholder for a Comax-specific transport mode if one exists. */
    transport?: 'rest' | 'soap' | 'unknown';
    /** Comax is multi-branch; which store/branch ids to scope. */
    branchIds?: string[];
    /** UNKNOWN — Comax may require additional account identifiers. */
    [key: string]: unknown;
}
