"use client";

import { Card, CardTitle, EmptyState } from "@/components/ui";
import { Activity } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n";
import type { AuditLog } from "@/types";

export function RecentActivity({ logs }: { logs: AuditLog[] }) {
    const { t, locale } = useAdminI18n();
    const recent = logs.slice(0, 6);

    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-4">
                <CardTitle>{t("dashboard.recentActivity.title")}</CardTitle>
            </div>
            {recent.length === 0 ? (
                <EmptyState
                    icon={<Activity size={18} />}
                    title={t("dashboard.recentActivity.empty")}
                    description={t("dashboard.recentActivity.emptyHint")}
                />
            ) : (
                <ol className="space-y-3">
                    {recent.map((log) => (
                        <li key={log._id} className="flex items-start gap-3 text-sm">
                            <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-900 dark:text-gray-100">
                                    <span className="font-medium">{log.performedBy?.email || t("audit.system")}</span>
                                    <span className="text-gray-500 dark:text-gray-400"> · </span>
                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{log.action}</span>
                                    <span className="text-gray-500 dark:text-gray-400"> · </span>
                                    <span className="text-gray-600 dark:text-gray-300">{log.entity}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateTime(log.createdAt, locale as Locale)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
