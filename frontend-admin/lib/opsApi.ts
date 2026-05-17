// Wrappers for Phase 7 endpoints: payments, shipments, suppliers,
// purchase orders, profitability, reconciliation history.

import api from "@/app/lib/api";
import type {
    PaymentMethod,
    PaymentRecord,
    ProfitabilitySummary,
    PurchaseOrder,
    PurchaseOrderStatus,
    ReconciliationHistoryEntry,
    ShipmentRecord,
    ShipmentStatus,
    Supplier,
    SupplierDetail,
} from "@/types";

// ── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentListResponse {
    success: boolean;
    data: PaymentRecord[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listPayments(params: { page?: number; invoiceId?: string; companyId?: string } = {}): Promise<PaymentListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.invoiceId) s.set("invoiceId", params.invoiceId);
    if (params.companyId) s.set("companyId", params.companyId);
    const qs = s.toString();
    const res = await api.get(`/crm/payments${qs ? `?${qs}` : ""}`);
    return res.data;
}

export interface PaymentPayload {
    invoiceId: string;
    amount: number;
    method?: PaymentMethod;
    externalRef?: string;
    notes?: string;
    paidAt?: string;
}

export async function postPayment(payload: PaymentPayload): Promise<void> {
    await api.post("/crm/payments", payload);
}

export async function voidPayment(id: string): Promise<void> {
    await api.post(`/crm/payments/${id}/void`);
}

// ── Shipments ────────────────────────────────────────────────────────────────

export async function listShipments(orderId?: string): Promise<ShipmentRecord[]> {
    const s = new URLSearchParams();
    if (orderId) s.set("orderId", orderId);
    const res = await api.get(`/crm/shipments${s.toString() ? `?${s.toString()}` : ""}`);
    return res.data.data;
}

export interface ShipmentPayload {
    orderId?: string;
    status?: ShipmentStatus;
    courier?: string;
    trackingNumber?: string;
    notes?: string;
}

export async function createShipment(payload: ShipmentPayload): Promise<ShipmentRecord> {
    const res = await api.post("/crm/shipments", payload);
    return res.data.data;
}

export async function updateShipment(id: string, payload: ShipmentPayload): Promise<ShipmentRecord> {
    const res = await api.patch(`/crm/shipments/${id}`, payload);
    return res.data.data;
}

// ── Suppliers ────────────────────────────────────────────────────────────────

export interface SupplierListResponse {
    success: boolean;
    data: Supplier[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listSuppliers(params: { page?: number; search?: string } = {}): Promise<SupplierListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.search) s.set("search", params.search);
    const qs = s.toString();
    const res = await api.get(`/crm/suppliers${qs ? `?${qs}` : ""}`);
    return res.data;
}

export async function getSupplier(id: string): Promise<SupplierDetail> {
    const res = await api.get(`/crm/suppliers/${id}`);
    return res.data.data;
}

export interface SupplierPayload {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
    isActive?: boolean;
    note?: string;
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
    const res = await api.post("/crm/suppliers", payload);
    return res.data.data;
}

export async function updateSupplier(id: string, payload: SupplierPayload): Promise<Supplier> {
    const res = await api.patch(`/crm/suppliers/${id}`, payload);
    return res.data.data;
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export interface PurchaseOrderListResponse {
    success: boolean;
    data: PurchaseOrder[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listPurchaseOrders(params: { page?: number; status?: PurchaseOrderStatus | ""; supplierId?: string } = {}): Promise<PurchaseOrderListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.status) s.set("status", params.status);
    if (params.supplierId) s.set("supplierId", params.supplierId);
    const qs = s.toString();
    const res = await api.get(`/crm/purchase-orders${qs ? `?${qs}` : ""}`);
    return res.data;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await api.get(`/crm/purchase-orders/${id}`);
    return res.data.data;
}

export interface PurchaseOrderPayload {
    supplierId?: string;
    items?: Array<{ productId: string; quantity: number; unitCost?: number }>;
    notes?: string;
    status?: PurchaseOrderStatus;
    expectedAt?: string;
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
    const res = await api.post("/crm/purchase-orders", payload);
    return res.data.data;
}

export async function updatePurchaseOrder(id: string, payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
    const res = await api.patch(`/crm/purchase-orders/${id}`, payload);
    return res.data.data;
}

export async function receivePurchaseOrder(id: string, receipts: Array<{ productId: string; quantity: number }>): Promise<void> {
    await api.post(`/crm/purchase-orders/${id}/receive`, { receipts });
}

// ── Profitability + reconciliation history ───────────────────────────────────

export async function getProfitability(): Promise<ProfitabilitySummary> {
    const res = await api.get("/crm/analytics/profitability");
    return res.data.data;
}

export async function getReconciliationHistory(): Promise<ReconciliationHistoryEntry[]> {
    const res = await api.get("/crm/inventory/reconciliation/history");
    return res.data.data;
}
