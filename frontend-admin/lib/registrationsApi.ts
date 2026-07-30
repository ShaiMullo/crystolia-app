import api from "@/app/lib/api";

export const REGISTRATIONS_CHANGED_EVENT = "crystolia:registrations-changed";

export function notifyRegistrationsChanged(): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(REGISTRATIONS_CHANGED_EVENT));
    }
}

export type RegistrationStatus = "pending" | "approved" | "rejected";
export type RegistrationMethod = "password" | "google";
export type NotificationStatus = "sent" | "failed" | "skipped" | "unknown";

export interface RegistrationNotifications {
    pendingEmailStatus?: NotificationStatus;
    pendingEmailAt?: string;
    approvedEmailStatus?: NotificationStatus;
    approvedEmailAt?: string;
    rejectedEmailStatus?: NotificationStatus;
    rejectedEmailAt?: string;
    adminSmsStatus?: NotificationStatus;
    adminSmsAt?: string;
}

export interface RegistrationCompanySnapshot {
    name: string;
    vatNumber: string;
    country: string;
    phone?: string;
}

/** Shape returned by GET /api/v1/users/registrations for the admin screen. */
export interface RegistrationRequest {
    _id: string;
    name?: string;
    email: string;
    phone?: string;
    avatar?: string;
    createdAt?: string;
    registrationStatus?: RegistrationStatus;
    registrationMethod?: RegistrationMethod;
    registrationCompany?: RegistrationCompanySnapshot;
    registrationFlags?: string[];
    registrationNotifications?: RegistrationNotifications;
    preferredLocale?: "he" | "en" | "ru";
    googleId?: string;
    company?: { _id: string; name: string; vatNumber?: string; country?: string; phone?: string } | null;
    approvedAt?: string;
    approvedBy?: { _id: string; name?: string; email?: string } | null;
    rejectedAt?: string;
    rejectedBy?: { _id: string; name?: string; email?: string } | null;
    rejectionReason?: string;
}

export interface RegistrationsPagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface ListRegistrationsParams {
    status?: RegistrationStatus;
    search?: string;
    page?: number;
    limit?: number;
}

export interface ListRegistrationsResult {
    data: RegistrationRequest[];
    pagination?: RegistrationsPagination;
}

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Legacy requests predate registrationMethod — fall back to the Google id. */
export function registrationMethodOf(r: RegistrationRequest): RegistrationMethod {
    return r.registrationMethod ?? (r.googleId ? "google" : "password");
}

/** Company details: the pre-approval snapshot, or the real company after it. */
export function registrationCompanyOf(r: RegistrationRequest): RegistrationCompanySnapshot | null {
    if (r.registrationCompany) return r.registrationCompany;
    if (r.company) {
        return {
            name: r.company.name,
            vatNumber: r.company.vatNumber ?? "",
            country: r.company.country ?? "",
            phone: r.company.phone,
        };
    }
    return null;
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function listRegistrations(params: ListRegistrationsParams = {}): Promise<ListRegistrationsResult> {
    const res = await api.get("/v1/users/registrations", { params });
    return { data: res.data?.data ?? [], pagination: res.data?.pagination };
}

export async function getRegistration(id: string): Promise<RegistrationRequest> {
    const res = await api.get(`/v1/users/registrations/${id}`);
    return res.data?.data;
}

export async function getRegistrationsCount(): Promise<number> {
    const res = await api.get("/v1/users/registrations/count");
    return res.data?.data?.pending ?? 0;
}

export interface ApproveRegistrationResult {
    alreadyApproved: boolean;
    emailNotificationSent?: boolean;
}

export async function approveRegistration(id: string): Promise<ApproveRegistrationResult> {
    const res = await api.post(`/v1/users/${id}/approve-registration`);
    return res.data?.data;
}

export interface RejectRegistrationPayload {
    reason?: string;
    /** Send the rejection email at all (default true). */
    notifyCustomer?: boolean;
    /** Include the reason text in the email — only when the admin opted in. */
    shareReason?: boolean;
}

export interface RejectRegistrationResult {
    alreadyRejected: boolean;
    emailNotificationSent?: boolean;
}

export async function rejectRegistration(id: string, payload: RejectRegistrationPayload): Promise<RejectRegistrationResult> {
    const res = await api.post(`/v1/users/${id}/reject-registration`, payload);
    return res.data?.data;
}

export interface ResendRegistrationEmailResult {
    kind: "pending" | "approved" | "rejected";
    sent: boolean;
    result: "sent" | "failed" | "skipped";
}

/** Resend the registration email matching the current status. Backend
 *  safe-delivery rules: a `sent` email is never resent (409
 *  NOTHING_TO_RETRY); an unknown/never-recorded outcome requires
 *  confirmUnknown=true (possible duplication acknowledged); concurrent
 *  resends get 429. */
export async function resendRegistrationEmail(
    id: string,
    options: { shareReason?: boolean; confirmUnknown?: boolean } = {},
): Promise<ResendRegistrationEmailResult> {
    const res = await api.post(`/v1/users/${id}/resend-registration-email`, options);
    return res.data?.data;
}

// ── Current-status registration email ────────────────────────────────────────
// THE single source of truth for "which email matches this registration's
// current status, and what happened to it". No pending-email fallback: a
// sent pending email must never make an unrecorded approval/rejection email
// look delivered.
export type RegistrationEmailKind = "pending" | "approved" | "rejected";

export function currentRegistrationEmail(r: RegistrationRequest): {
    kind: RegistrationEmailKind;
    status?: NotificationStatus;
    at?: string;
} {
    const n = r.registrationNotifications;
    if (r.registrationStatus === "approved") {
        return { kind: "approved", status: n?.approvedEmailStatus, at: n?.approvedEmailAt };
    }
    if (r.registrationStatus === "rejected") {
        return { kind: "rejected", status: n?.rejectedEmailStatus, at: n?.rejectedEmailAt };
    }
    return { kind: "pending", status: n?.pendingEmailStatus, at: n?.pendingEmailAt };
}

