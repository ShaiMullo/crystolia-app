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
