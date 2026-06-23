import api from "@/app/lib/api";

/**
 * A company record as returned by GET /api/companies.
 *
 * Intentionally a superset of what the Users page needs so CRM / orders /
 * inventory and future modules can import this client without modification.
 */
export interface Company {
    _id: string;
    name: string;
    email?: string;
    billingEmail?: string;
    address?: string;
    city?: string;
    vatNumber?: string;
    phone?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CompaniesPagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface ListCompaniesParams {
    search?: string;
    active?: boolean;
    page?: number;
    limit?: number;
}

export interface ListCompaniesResult {
    data: Company[];
    pagination?: CompaniesPagination;
}

/**
 * List companies (admin only). Supports search / active / pagination so any
 * module can reuse it. Sending page/limit makes the backend include
 * `pagination`; otherwise a plain array is returned.
 */
export async function listCompanies(params: ListCompaniesParams = {}): Promise<ListCompaniesResult> {
    const res = await api.get("/companies", { params });
    const body = res.data;
    // Tolerate both the wrapped ({ data, pagination }) and bare-array shapes.
    if (Array.isArray(body)) return { data: body };
    return { data: body?.data ?? [], pagination: body?.pagination };
}
