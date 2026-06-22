// ===============================================
// 🟦 comaxMapper — payload mapping placeholder (NO implementation)
// ===============================================
// Translates between Comax's native payloads and Crystolia's canonical DTOs
// (integrations/types/erp.ts). Implementing this requires the REAL Comax field
// names, which are UNKNOWN today — so every mapper throws rather than guessing a
// mapping that would silently corrupt data.

import type {
    ERPProductDTO,
    ERPCustomerDTO,
    ERPInventoryLevelDTO,
    ERPOrderDTO,
    ERPInvoiceDTO,
    ERPSupplierDTO,
    ERPPriceListDTO,
    ERPWarehouseDTO,
} from '../../types/erp.js';
import type {
    ComaxItemRaw,
    ComaxCustomerRaw,
    ComaxStockRaw,
    ComaxOrderRaw,
    ComaxDocumentRaw,
    ComaxSupplierRaw,
    ComaxPriceListRaw,
    ComaxBranchRaw,
} from '../comaxTypes.js';

function notMapped(kind: string): never {
    throw new Error(
        `[comax] ${kind} mapping is not implemented — official Comax field definitions required ` +
            `(see docs/integrations/comax-research.md). Refusing to guess a mapping.`,
    );
}

// --- inbound: Comax → canonical DTO (pull) ---
export const comaxMapper = {
    toProduct(_raw: ComaxItemRaw): ERPProductDTO {
        return notMapped('product');
    },
    toCustomer(_raw: ComaxCustomerRaw): ERPCustomerDTO {
        return notMapped('customer');
    },
    toInventoryLevel(_raw: ComaxStockRaw): ERPInventoryLevelDTO {
        return notMapped('inventory');
    },
    toOrder(_raw: ComaxOrderRaw): ERPOrderDTO {
        return notMapped('order');
    },
    toInvoice(_raw: ComaxDocumentRaw): ERPInvoiceDTO {
        return notMapped('invoice');
    },
    toSupplier(_raw: ComaxSupplierRaw): ERPSupplierDTO {
        return notMapped('supplier');
    },
    toPriceList(_raw: ComaxPriceListRaw): ERPPriceListDTO {
        return notMapped('priceList');
    },
    toWarehouse(_raw: ComaxBranchRaw): ERPWarehouseDTO {
        return notMapped('warehouse');
    },

    // --- outbound: canonical DTO → Comax (push) ---
    fromOrder(_dto: ERPOrderDTO): ComaxOrderRaw {
        return notMapped('order(outbound)');
    },
    fromCustomer(_dto: ERPCustomerDTO): ComaxCustomerRaw {
        return notMapped('customer(outbound)');
    },
};
