// Thin wrappers for Phase 4 CRM endpoints (tasks, notifications, analytics, activity).

import api from "@/app/lib/api";
import type {
    AuditLog,
    NotificationRecord,
    PipelineAnalytics,
    TaskPriority,
    TaskRecord,
    TaskRelatedType,
    TaskStatus,
} from "@/types";

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskListParams {
    page?: number;
    limit?: number;
    status?: TaskStatus | "";
    priority?: TaskPriority | "";
    assignedTo?: string;
    relatedType?: TaskRelatedType;
    relatedId?: string;
    overdue?: boolean;
}

export interface TaskListResponse {
    success: boolean;
    data: TaskRecord[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
    const s = new URLSearchParams();
    if (params.page) s.set("page", String(params.page));
    if (params.limit) s.set("limit", String(params.limit));
    if (params.status) s.set("status", params.status);
    if (params.priority) s.set("priority", params.priority);
    if (params.assignedTo) s.set("assignedTo", params.assignedTo);
    if (params.relatedType) s.set("relatedType", params.relatedType);
    if (params.relatedId) s.set("relatedId", params.relatedId);
    if (params.overdue) s.set("overdue", "true");
    const qs = s.toString();
    const res = await api.get(`/crm/tasks${qs ? `?${qs}` : ""}`);
    return res.data;
}

export interface TaskUpsertPayload {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: string;
    assignedTo?: string;
    relatedType?: TaskRelatedType;
    relatedId?: string;
    relatedLabel?: string;
}

export async function createTask(payload: TaskUpsertPayload): Promise<TaskRecord> {
    const res = await api.post("/crm/tasks", payload);
    return res.data.data;
}

export async function updateTask(id: string, payload: TaskUpsertPayload): Promise<TaskRecord> {
    const res = await api.patch(`/crm/tasks/${id}`, payload);
    return res.data.data;
}

export async function deleteTask(id: string): Promise<void> {
    await api.delete(`/crm/tasks/${id}`);
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface NotificationListResponse {
    success: boolean;
    data: NotificationRecord[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export async function listNotifications(unreadOnly = false, limit = 20): Promise<NotificationListResponse> {
    const s = new URLSearchParams();
    if (unreadOnly) s.set("unread", "true");
    s.set("limit", String(limit));
    const res = await api.get(`/crm/notifications?${s.toString()}`);
    return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
    await api.post(`/crm/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
    await api.post(`/crm/notifications/read-all`);
}

// ── Analytics + Activity ─────────────────────────────────────────────────────

export async function getPipelineAnalytics(): Promise<PipelineAnalytics> {
    const res = await api.get("/crm/analytics/pipeline");
    return res.data.data;
}

export async function listActivity(entity?: string, limit = 30): Promise<AuditLog[]> {
    const s = new URLSearchParams();
    if (entity) s.set("entity", entity);
    s.set("limit", String(limit));
    const res = await api.get(`/crm/analytics/activity?${s.toString()}`);
    return res.data.data;
}
