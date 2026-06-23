/**
 * Extracts a human-readable message from a backend error response.
 *
 * Backend error shape (see backend middleware/errorHandler.ts):
 *   { success: false, error: string, details?: string[] }
 *
 * Domain-agnostic — usable by any module, not just users.
 */
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
    const data = (
        err as { response?: { data?: { error?: string; message?: string; details?: string[] } } }
    )?.response?.data;

    if (data) {
        if (Array.isArray(data.details) && data.details.length > 0) return data.details.join(", ");
        if (typeof data.error === "string" && data.error) return data.error;
        if (typeof data.message === "string" && data.message) return data.message;
    }

    const message = (err as { message?: string })?.message;
    return message || fallback;
}
