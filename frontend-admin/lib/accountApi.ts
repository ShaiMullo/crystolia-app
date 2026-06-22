import api from "@/app/lib/api";

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

/**
 * Self-service password change. Passwords are sent only in the request body —
 * never logged or persisted client-side. On success the backend re-issues the
 * auth cookie for the current session.
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
    await api.post("/auth/change-password", input);
}
