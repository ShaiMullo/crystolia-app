"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Activity as ActivityIcon } from "lucide-react";
import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    Select,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { listActivity } from "@/lib/crmApi";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { AuditLog } from "@/types";

const ENTITY_FILTERS = ["", "Lead", "Customer", "Order", "Invoice", "Task", "User"] as const;
type EntityFilter = (typeof ENTITY_FILTERS)[number];

export default function ActivityPage() {
    const { t, locale } = useAdminI18n();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [entity, setEntity] = useState<EntityFilter>("");
    const [limit, setLimit] = useState(50);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listActivity(entity || undefined, limit);
            setLogs(data || []);
        } catch (err) {
            console.error(err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [entity, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("activity.pageTitle")}
                description={t("activity.pageSubtitle")}
                actions={
                    <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchLogs}>
                        {t("common.refresh")}
                    </Button>
                }
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <Select
                    value={entity}
                    onChange={(e) => setEntity(e.target.value as EntityFilter)}
                    className="sm:w-48"
                >
                    <option value="">{t("activity.allEntities")}</option>
                    {ENTITY_FILTERS.filter(Boolean).map((e) => (
                        <option key={e} value={e}>{e}</option>
                    ))}
                </Select>
                <Select
                    value={String(limit)}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="sm:w-40"
                >
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </Select>
            </div>

            <Card padded={false}>
                {loading ? (
                    <div className="p-6"><LoadingState label={t("activity.loading")} /></div>
                ) : logs.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon={<ActivityIcon size={18} />} title={t("activity.empty")} />
                    </div>
                ) : (
                    <ol className="divide-y divide-gray-100 dark:divide-gray-800">
                        {logs.map((log) => (
                            <li key={log._id} className="flex items-start gap-3 p-4">
                                <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-500" aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        <span className="font-medium">
                                            {log.performedBy?.email || t("audit.system")}
                                        </span>
                                        <span className="text-gray-400"> · </span>
                                        <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{log.action}</span>
                                        <span className="text-gray-400"> · </span>
                                        <span className="text-gray-600 dark:text-gray-300">{log.entity}</span>
                                        {log.entityId && (
                                            <>
                                                <span className="text-gray-400"> / </span>
                                                <span className="font-mono text-xs text-gray-500">{log.entityId.slice(-8)}</span>
                                            </>
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                        {formatDateTime(log.createdAt, locale as Locale)}
                                    </p>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <p className="mt-1 text-xs text-gray-400 break-words line-clamp-2">
                                            {JSON.stringify(log.details)}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>
        </div>
    );
}
