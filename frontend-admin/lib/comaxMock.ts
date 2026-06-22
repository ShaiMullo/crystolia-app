// ===============================================
// 🟦 Comax admin — LOCAL MOCK DATA ONLY
// ===============================================
// This file feeds the Integrations → Comax preview screen. It is 100% static
// mock data — there is NO backend route, NO axios call, NO live status here.
// The connector is a non-executing stub awaiting official Comax API docs, so the
// UI deliberately shows a permanently "not connected / disabled" state.

export type ComaxEntityKey = "products" | "customers" | "inventory" | "orders" | "invoices";

export interface ComaxEntityRow {
    key: ComaxEntityKey;
    /** Always null — nothing has ever synced. */
    lastSyncAt: string | null;
    status: "never";
    records: number;
}

export interface ComaxMockStatus {
    connected: false;
    health: "disabled";
    lastSyncAt: string | null;
    lastError: string | null;
    entities: ComaxEntityRow[];
}

/** The single source of (fake) truth for the preview page. */
export const comaxMockStatus: ComaxMockStatus = {
    connected: false,
    health: "disabled",
    lastSyncAt: null,
    lastError: null,
    entities: [
        { key: "products", lastSyncAt: null, status: "never", records: 0 },
        { key: "customers", lastSyncAt: null, status: "never", records: 0 },
        { key: "inventory", lastSyncAt: null, status: "never", records: 0 },
        { key: "orders", lastSyncAt: null, status: "never", records: 0 },
        { key: "invoices", lastSyncAt: null, status: "never", records: 0 },
    ],
};
