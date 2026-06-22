// ===============================================
// 🧩 Canonical ERP domain types (provider-agnostic)
// ===============================================
// These DTOs are the *neutral* shape the platform speaks internally.
// Every connector (Comax, Priority, SAP B1, NetSuite, Dynamics, …) maps the
// vendor's native payload INTO / OUT OF these shapes via its own mapper.
//
// Nothing here is Comax-specific. No vendor field names leak into this file.
// `raw` always carries the untouched vendor payload for debugging/auditing.

/** Identifier of a supported (or future) ERP provider. Open-ended on purpose. */
export type ERPProviderId =
    | 'comax'
    | 'priority'
    | 'sap_business_one'
    | 'netsuite'
    | 'dynamics'
    // allow future providers without a code change, while keeping autocomplete
    | (string & Record<never, never>);

/** A reference back to the source system for any synced record. */
export interface ExternalRef {
    /** The record's primary id in the ERP. */
    externalId: string;
    /** Which ERP this came from (matches `externalSource` on our models). */
    externalSource: ERPProviderId;
    /** When the ERP last changed it, if the ERP exposes that. */
    externalUpdatedAt?: Date;
    /** Untouched vendor payload — never parsed for business logic, kept for audit. */
    raw?: unknown;
}

export interface ERPProductDTO extends ExternalRef {
    sku?: string;
    barcode?: string;
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    active?: boolean;
    /** Branch/warehouse-scoped attributes left to the connector to flatten. */
    attributes?: Record<string, unknown>;
}

export interface ERPCustomerDTO extends ExternalRef {
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
    address?: ERPAddressDTO;
}

export interface ERPAddressDTO {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
}

export interface ERPInventoryLevelDTO extends ExternalRef {
    productExternalId: string;
    warehouseExternalId?: string;
    quantityOnHand: number;
    quantityReserved?: number;
}

export interface ERPOrderLineDTO {
    productExternalId: string;
    sku?: string;
    quantity: number;
    unitPrice?: number;
}

export interface ERPOrderDTO extends ExternalRef {
    orderNumber?: string;
    customerExternalId?: string;
    status?: string;
    currency?: string;
    total?: number;
    lines: ERPOrderLineDTO[];
    placedAt?: Date;
}

export interface ERPInvoiceDTO extends ExternalRef {
    invoiceNumber?: string;
    orderExternalId?: string;
    customerExternalId?: string;
    total?: number;
    currency?: string;
    issuedAt?: Date;
    documentUrl?: string;
}

export interface ERPSupplierDTO extends ExternalRef {
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
}

export interface ERPPriceListDTO extends ExternalRef {
    code?: string;
    name: string;
    currency?: string;
    entries?: Array<{ productExternalId: string; price: number }>;
}

export interface ERPWarehouseDTO extends ExternalRef {
    code?: string;
    name: string;
    /** Comax-style "store/branch id" maps here, but the field stays generic. */
    branchId?: string;
}

/** Union of every entity the generic interface can sync. */
export type ERPEntityDTO =
    | ERPProductDTO
    | ERPCustomerDTO
    | ERPInventoryLevelDTO
    | ERPOrderDTO
    | ERPInvoiceDTO
    | ERPSupplierDTO
    | ERPPriceListDTO
    | ERPWarehouseDTO;
