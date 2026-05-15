// Thin wrapper around /api/crm/customers — keeps callsites consistent
// and decouples pages/components from axios specifics.

import api from "@/app/lib/api";
import type {
    Customer,
    CustomerDetail,
    CustomerStatus,
    User,
} from "@/types";

export interface CustomersListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: CustomerStatus | "";
    assignedTo?: string;
    tags?: string;
}

export interface CustomersListResponse {
    success: boolean;
    data: Customer[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listCustomers(params: CustomersListParams = {}): Promise<CustomersListResponse> {
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.limit) search.set("limit", String(params.limit));
    if (params.search) search.set("search", params.search);
    if (params.status) search.set("status", params.status);
    if (params.assignedTo) search.set("assignedTo", params.assignedTo);
    if (params.tags) search.set("tags", params.tags);
    const qs = search.toString();
    const res = await api.get(`/crm/customers${qs ? `?${qs}` : ""}`);
    return res.data;
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
    const res = await api.get(`/crm/customers/${id}`);
    return res.data.data;
}

export interface CustomerUpsertPayload {
    companyName?: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    status?: CustomerStatus;
    tags?: string[];
    assignedTo?: string;
    note?: string;
}

export async function createCustomer(payload: CustomerUpsertPayload): Promise<{ data: Customer; idempotent?: boolean }> {
    const res = await api.post("/crm/customers", payload);
    return res.data;
}

export async function updateCustomer(id: string, payload: CustomerUpsertPayload): Promise<Customer> {
    const res = await api.patch(`/crm/customers/${id}`, payload);
    return res.data.data;
}

export async function deleteCustomer(id: string): Promise<void> {
    await api.delete(`/crm/customers/${id}`);
}

export type AgentUser = User;
