// Wrappers for the admin order workflow (/api/crm/orders) and finance analytics.

import api from "@/app/lib/api";
import type {
    FinanceSummary,
    Order,
    OrderDetail,
    OrderInventoryPreviewLine,
    OrderStatus,
    OrderTotals,
} from "@/types";

export interface OrderListParams {
    page?: number;
    limit?: number;
    status?: OrderStatus | "";
    companyId?: string;
}

export interface OrderListResponse {
    success: boolean;
    data: Order[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listOrders(params: OrderListParams = {}): Promise<OrderListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.limit) s.set("limit", String(params.limit));
    if (params.status) s.set("status", params.status);
    if (params.companyId) s.set("companyId", params.companyId);
    const qs = s.toString();
    const res = await api.get(`/v1/orders${qs ? `?${qs}` : ""}`);
    return res.data;
}

export async function getOrder(id: string): Promise<OrderDetail> {
    const res = await api.get(`/v1/orders/${id}`);
    return res.data.data;
}

export interface OrderItemInput {
    productId?: string;
    productName: string;
    quantity: number;
    price: number;
    taxRate?: number;
}

export interface OrderUpsertPayload {
    customerId?: string;
    companyId?: string;
    items?: OrderItemInput[];
    notes?: string;
    status?: OrderStatus;
    rejectionReason?: string;
}

export async function previewOrder(items: OrderItemInput[]): Promise<{ totals: OrderTotals; preview: OrderInventoryPreviewLine[] }> {
    const res = await api.post("/v1/orders/preview", { items });
    return res.data.data;
}

export async function createOrder(payload: OrderUpsertPayload): Promise<Order> {
    const res = await api.post("/v1/orders", payload);
    return res.data.data;
}

export async function updateOrder(id: string, payload: OrderUpsertPayload): Promise<Order> {
    const res = await api.patch(`/v1/orders/${id}`, payload);
    return res.data.data;
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
    const res = await api.get("/v1/analytics/finance");
    return res.data.data;
}

/** Per-channel retry of the customer notification for the order's current
 *  status. Backend semantics: only failed/skipped channels are re-sent;
 *  `unknown` delivery requires confirmUnknown (possible duplication
 *  acknowledged). Response reports the per-channel results and an overall
 *  outcome (success/partial/failed). */
export interface NotificationRetryResult {
    attempted: Array<"email" | "sms">;
    results: Partial<Record<"email" | "sms", "sent" | "failed" | "skipped">>;
    outcome: "success" | "partial" | "failed";
}

export async function retryOrderNotification(
    id: string,
    options: { confirmUnknown?: boolean } = {},
): Promise<NotificationRetryResult> {
    const res = await api.post(`/v1/orders/${id}/notifications/retry`, options);
    return res.data.data;
}
