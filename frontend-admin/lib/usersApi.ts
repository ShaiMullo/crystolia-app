import api from "@/app/lib/api";

export type UserRole = "admin" | "agent" | "customer";

/**
 * Shape returned by GET /api/users for the admin users page. Kept separate from
 * the dashboard's `User` type so this page can evolve without touching it.
 */
export interface AdminUser {
    _id: string;
    name?: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    company?: { _id: string; name: string } | null;
    phone?: string;
    lastLogin?: string;
    createdAt?: string;
    mustChangePassword?: boolean;
}

export interface UsersPagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface ListUsersParams {
    role?: UserRole;
    status?: "active" | "inactive";
    search?: string;
    company?: string;
    page?: number;
    limit?: number;
}

export interface ListUsersResult {
    data: AdminUser[];
    pagination?: UsersPagination;
}

/**
 * List users with optional filters + pagination (3a backend). Sending
 * page/limit makes the backend include `pagination`; the dashboard's bare
 * `GET /users` call still returns a plain array and is unaffected.
 */
export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
    const res = await api.get("/users", { params });
    return { data: res.data?.data ?? [], pagination: res.data?.pagination };
}

// ── Mutations (3a backend; guards enforced server-side) ──────────────────────

export interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    /** Company ObjectId — applied by the backend only when role === "customer". */
    company?: string | null;
    mustChangePassword?: boolean;
}

export interface UpdateUserPayload {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    phone?: string;
    company?: string | null;
    isActive?: boolean;
}

export interface ResetPasswordResult {
    /** One-time temporary password — shown to the admin once, never re-fetchable. */
    tempPassword: string;
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const res = await api.post("/users", payload);
    return res.data?.data ?? res.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    const res = await api.patch(`/users/${id}`, payload);
    return res.data?.data ?? res.data;
}

export async function deleteUser(id: string): Promise<{ id: string; isDeleted: boolean }> {
    const res = await api.delete(`/users/${id}`);
    return res.data?.data ?? res.data;
}

export async function resetUserPassword(id: string): Promise<ResetPasswordResult> {
    const res = await api.post(`/users/${id}/reset-password`);
    return res.data?.data ?? res.data;
}
