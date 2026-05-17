// Wrappers for Phase 8 system endpoints: health, jobs, backups,
// diagnostics, audit search, exports.

import api from "@/app/lib/api";

export type HealthSeverity = "healthy" | "warning" | "critical";

export interface ReplicaDiagnostics {
    connected: boolean;
    isReplicaSet: boolean;
    transactionsSupported: boolean;
    topology: string;
    setName?: string;
    checkedAt: string;
}

export interface SystemHealth {
    healthScore: number;
    severity: HealthSeverity;
    reconciliation: {
        driftCount: number;
        issueCount: number;
        negativeStockCount: number;
        impossibleStateCount: number;
        mismatchCount: number;
        healthScore: number;
        severity: HealthSeverity;
        ranAt: string;
    };
    failedJobs: number;
    lowStockCount: number;
    overdueInvoices: number;
    paymentMismatchCount: number;
    lastBackup: { _id: string; status: string; createdAt: string; totalDocuments: number } | null;
    recentFailures: Array<{ jobKey: string; error?: string; createdAt: string }>;
    diagnostics: ReplicaDiagnostics;
    checkedAt: string;
}

export interface ScheduledJobRow {
    _id: string;
    key: string;
    name: string;
    description?: string;
    enabled: boolean;
    intervalMs: number;
    lastRunAt?: string;
    lastStatus: "idle" | "running" | "success" | "failed";
    lastDurationMs?: number;
    lastError?: string;
    runCount: number;
    failureCount: number;
}

export interface JobRunRecord {
    _id: string;
    jobKey: string;
    status: "success" | "failed";
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    error?: string;
    trigger: "scheduled" | "manual";
    createdAt: string;
}

export interface BackupManifestRecord {
    _id: string;
    label: string;
    status: "pending" | "completed" | "failed" | "verified";
    totalDocuments: number;
    sizeEstimateBytes: number;
    collections: Array<{ collection: string; documentCount: number }>;
    startedAt: string;
    completedAt?: string;
    verifiedAt?: string;
    error?: string;
    createdAt: string;
}

export interface AuditEntry {
    _id: string;
    action: string;
    entity: string;
    entityId: string;
    performedBy: { _id: string; name?: string; email: string; role?: string } | string;
    severity: "info" | "warning" | "critical";
    correlationId?: string;
    actorSnapshot?: { name?: string; email?: string; role?: string };
    details?: Record<string, unknown>;
    ipAddress?: string;
    createdAt: string;
}

// ── Health + diagnostics ─────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<SystemHealth> {
    const res = await api.get("/crm/system/health");
    return res.data.data;
}

export async function getDiagnostics(): Promise<ReplicaDiagnostics> {
    const res = await api.get("/crm/system/diagnostics");
    return res.data.data;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function listJobs(): Promise<ScheduledJobRow[]> {
    const res = await api.get("/crm/system/jobs");
    return res.data.data;
}

export async function listJobRuns(key: string): Promise<JobRunRecord[]> {
    const res = await api.get(`/crm/system/jobs/${key}/runs`);
    return res.data.data;
}

export async function setJobEnabled(key: string, enabled: boolean): Promise<void> {
    await api.patch(`/crm/system/jobs/${key}`, { enabled });
}

export async function runJobNow(key: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
    const res = await api.post(`/crm/system/jobs/${key}/run`);
    return res.data.data;
}

// ── Backups ──────────────────────────────────────────────────────────────────

export async function listBackups(): Promise<BackupManifestRecord[]> {
    const res = await api.get("/crm/system/backups");
    return res.data.data;
}

export async function createBackup(label: string): Promise<void> {
    await api.post("/crm/system/backups", { label });
}

export async function verifyBackup(id: string): Promise<{ verified: boolean; drift: number }> {
    const res = await api.post(`/crm/system/backups/${id}/verify`);
    return res.data.data;
}

// ── Audit search ─────────────────────────────────────────────────────────────

export interface AuditSearchParams {
    page?: number;
    entity?: string;
    action?: string;
    severity?: string;
    from?: string;
    to?: string;
}

export interface AuditSearchResponse {
    success: boolean;
    data: AuditEntry[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function searchAudit(params: AuditSearchParams = {}): Promise<AuditSearchResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.entity) s.set("entity", params.entity);
    if (params.action) s.set("action", params.action);
    if (params.severity) s.set("severity", params.severity);
    if (params.from) s.set("from", params.from);
    if (params.to) s.set("to", params.to);
    const qs = s.toString();
    const res = await api.get(`/crm/system/audit${qs ? `?${qs}` : ""}`);
    return res.data;
}

// ── Exports ──────────────────────────────────────────────────────────────────

export type ExportDataset = "customers" | "orders" | "inventory" | "payments" | "profitability";

/** Trigger a browser download of an export file. */
export async function downloadExport(dataset: ExportDataset, format: "csv" | "json"): Promise<void> {
    const res = await api.get(`/crm/exports/${dataset}?format=${format}`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset}-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
