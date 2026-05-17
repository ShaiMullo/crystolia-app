// Wrappers for Phase 5 products + inventory endpoints.

import api from "@/app/lib/api";
import type {
    InventoryMovementRecord,
    InventoryMovementType,
    InventoryRow,
    Product,
    ProductUnit,
} from "@/types";

// ── Products ─────────────────────────────────────────────────────────────────

export interface ProductListParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    category?: string;
}

export interface ProductListResponse {
    success: boolean;
    data: Product[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.limit) s.set("limit", String(params.limit));
    if (params.search) s.set("search", params.search);
    if (typeof params.isActive === "boolean") s.set("isActive", params.isActive ? "true" : "false");
    if (params.category) s.set("category", params.category);
    const qs = s.toString();
    const res = await api.get(`/crm/products${qs ? `?${qs}` : ""}`);
    return res.data;
}

export interface ProductPayload {
    name?: string;
    sku?: string;
    category?: string;
    description?: string;
    unit?: ProductUnit;
    price?: number;
    currency?: string;
    taxRate?: number;
    isActive?: boolean;
    stockTrackingEnabled?: boolean;
    tags?: string[];
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
    const res = await api.post("/crm/products", payload);
    return res.data.data;
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
    const res = await api.patch(`/crm/products/${id}`, payload);
    return res.data.data;
}

export async function deleteProduct(id: string): Promise<void> {
    await api.delete(`/crm/products/${id}`);
}

// ── Inventory ────────────────────────────────────────────────────────────────

export async function listInventory(lowOnly = false): Promise<InventoryRow[]> {
    const s = new URLSearchParams();
    if (lowOnly) s.set("lowOnly", "true");
    const res = await api.get(`/crm/inventory${s.toString() ? `?${s.toString()}` : ""}`);
    return res.data.data;
}

export interface MovementPayload {
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    reason?: string;
    location?: string;
    relatedOrderId?: string;
}

export async function createMovement(payload: MovementPayload): Promise<void> {
    await api.post("/crm/inventory/movements", payload);
}

export interface MovementListResponse {
    success: boolean;
    data: InventoryMovementRecord[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listMovements(productId?: string, limit = 30): Promise<MovementListResponse> {
    const s = new URLSearchParams();
    if (productId) s.set("productId", productId);
    s.set("limit", String(limit));
    const res = await api.get(`/crm/inventory/movements?${s.toString()}`);
    return res.data;
}

export async function updateThreshold(productId: string, minimumQuantity: number, location = "main"): Promise<void> {
    const s = new URLSearchParams();
    s.set("location", location);
    await api.patch(`/crm/inventory/${productId}?${s.toString()}`, { minimumQuantity });
}
