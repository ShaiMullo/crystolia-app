"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Check, AlertCircle, CalendarClock, Bot } from "lucide-react";
import {
    Badge,
    EmptyState,
    LoadingState,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDate, formatDateTime } from "@/lib/format";
import { listTasks, updateTask, type TaskListParams } from "@/lib/crmApi";
import type { Locale } from "@/i18n";
import type { TaskRecord } from "@/types";
import { cn } from "@/lib/cn";

const PRIORITY_TONE = {
    low: "neutral",
    normal: "neutral",
    high: "warning",
    urgent: "danger",
} as const;

function relatedHref(t: TaskRecord): string | null {
    if (!t.relatedId) return null;
    if (t.relatedType === "Lead") return `/admin/leads/${t.relatedId}`;
    if (t.relatedType === "Customer") return `/admin/customers/${t.relatedId}`;
    return null;
}

interface TaskListProps {
    title?: string;
    params?: TaskListParams;
    /** Render compactly for dashboard widget. */
    compact?: boolean;
    /** Show a "view all" CTA when compact and there are more results. */
    viewAllHref?: string;
    limit?: number;
    /** Auto-refresh every N ms. Used by the dashboard widget. */
    refreshMs?: number;
}

export function TaskList({ title, params, compact, viewAllHref, limit = 10, refreshMs }: TaskListProps) {
    const { t, locale } = useAdminI18n();
    const [tasks, setTasks] = useState<TaskRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    const fetchList = useCallback(async () => {
        try {
            const res = await listTasks({ ...params, limit });
            setTasks(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error(t("tasks.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [params, limit, t]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        if (!refreshMs) return;
        const id = setInterval(fetchList, refreshMs);
        return () => clearInterval(id);
    }, [fetchList, refreshMs]);

    const handleComplete = async (id: string) => {
        const target = tasks.find((x) => x._id === id);
        if (!target) return;
        const prevStatus = target.status;

        setTasks((prev) => prev.map((x) => (x._id === id ? { ...x, status: "done", completedAt: new Date().toISOString() } : x)));
        setSavingIds((prev) => new Set(prev).add(id));
        try {
            await updateTask(id, { status: "done" });
            toast.success(t("tasks.toasts.completed"));
        } catch {
            toast.error(t("tasks.toasts.completeFailed"));
            setTasks((prev) => prev.map((x) => (x._id === id ? { ...x, status: prevStatus, completedAt: undefined } : x)));
        } finally {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    if (loading) return <LoadingState label={t("tasks.loading")} />;

    if (tasks.length === 0) {
        return (
            <EmptyState
                icon={<CalendarClock size={18} />}
                title={t("tasks.empty")}
                description={t("tasks.emptyHint")}
            />
        );
    }

    const now = Date.now();

    return (
        <div className="space-y-2">
            {title && (
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            )}
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {tasks.map((task) => {
                    const isDone = task.status === "done" || task.status === "cancelled";
                    const due = task.dueAt ? new Date(task.dueAt).getTime() : null;
                    const overdue = !isDone && due !== null && due < now;
                    const href = relatedHref(task);
                    return (
                        <li key={task._id} className={cn("flex items-start gap-3 p-3", isDone && "opacity-60")}>
                            <button
                                type="button"
                                aria-label={t("tasks.completeAria")}
                                disabled={isDone || savingIds.has(task._id)}
                                onClick={() => handleComplete(task._id)}
                                className={cn(
                                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    isDone
                                        ? "border-emerald-400 bg-emerald-500 text-white"
                                        : "border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 dark:border-gray-600 dark:hover:bg-emerald-900/20",
                                )}
                            >
                                {isDone && <Check size={12} />}
                            </button>
                            <div className="min-w-0 flex-1">
                                <p className={cn("text-sm font-medium", isDone ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-50")}>
                                    {task.title}
                                </p>
                                {!compact && task.description && (
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    {task.dueAt && (
                                        <span className={cn("inline-flex items-center gap-1", overdue && "text-red-600 font-medium")}>
                                            <CalendarClock size={12} />
                                            {compact ? formatDate(task.dueAt, locale as Locale) : formatDateTime(task.dueAt, locale as Locale)}
                                        </span>
                                    )}
                                    {overdue && (
                                        <span className="inline-flex items-center gap-1 text-red-600">
                                            <AlertCircle size={12} /> {t("tasks.overdue")}
                                        </span>
                                    )}
                                    {task.priority !== "normal" && task.priority !== "low" && (
                                        <Badge tone={PRIORITY_TONE[task.priority]} size="sm">{t(`tasks.priority.${task.priority}`)}</Badge>
                                    )}
                                    {task.sourceAutomation && (
                                        <span className="inline-flex items-center gap-1">
                                            <Bot size={12} /> {t("tasks.fromAutomation")}
                                        </span>
                                    )}
                                    {href && task.relatedLabel && (
                                        <Link href={href} className="text-blue-600 hover:underline">
                                            {task.relatedLabel}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {compact && viewAllHref && (
                <div className="flex justify-end">
                    <Link href={viewAllHref} className="text-xs text-yellow-700 hover:underline">
                        {t("tasks.viewAll")}
                    </Link>
                </div>
            )}
        </div>
    );
}
