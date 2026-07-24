"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Activity as ActivityIcon } from "lucide-react";
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Input,
    LoadingState,
    Pagination,
    PageHeader,
    Select,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { searchAudit, type AuditEntry } from "@/lib/systemApi";
import { formatDateTime, summarizeAuditDetails } from "@/lib/format";
import type { Locale } from "@/i18n";

const ENTITY_FILTERS = [
    "", "Lead", "Customer", "Order", "Invoice", "Payment", "Shipment",
    "Product", "Supplier", "PurchaseOrder", "Task", "User", "BackupManifest", "ScheduledJob",
] as const;
const ACTION_FILTERS = ["", "CREATE", "UPDATE", "DELETE", "READ"] as const;
const SEVERITY_FILTERS = ["", "info", "warning", "critical"] as const;

const SEVERITY_TONE = { info: "neutral", warning: "warning", critical: "danger" } as const;

function actorLabel(log: AuditEntry, systemLabel: string): string {
    if (log.actorSnapshot?.email) return log.actorSnapshot.email;
    if (typeof log.performedBy === "object" && log.performedBy) return log.performedBy.email;
    return systemLabel;
}

export default function ActivityPage() {
    const { t, locale } = useAdminI18n();
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entity, setEntity] = useState("");
    const [action, setAction] = useState("");
    const [severity, setSeverity] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await searchAudit({
                page,
                entity: entity || undefined,
                action: action || undefined,
                severity: severity || undefined,
                from: from || undefined,
                to: to || undefined,
            });
            setLogs(res.data || []);
            setTotalPages(res.pagination?.pages || 1);
        } catch (err) {
            console.error(err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, entity, action, severity, from, to]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        setPage(1);
    }, [entity, action, severity, from, to]);

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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
                    <option value="">{t("activity.allEntities")}</option>
                    {ENTITY_FILTERS.filter(Boolean).map((e) => (
                        <option key={e} value={e}>{e}</option>
                    ))}
                </Select>
                <Select value={action} onChange={(e) => setAction(e.target.value)}>
                    <option value="">{t("audit.allActions")}</option>
                    {ACTION_FILTERS.filter(Boolean).map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </Select>
                <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="">{t("audit.allSeverities")}</option>
                    {SEVERITY_FILTERS.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{t(`audit.severity.${s}`)}</option>
                    ))}
                </Select>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("audit.from")} />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("audit.to")} />
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
                                <span
                                    className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                                        log.severity === "critical" ? "bg-red-500"
                                            : log.severity === "warning" ? "bg-amber-500" : "bg-yellow-500"
                                    }`}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        <span className="font-medium">{actorLabel(log, t("audit.system"))}</span>
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
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{formatDateTime(log.createdAt, locale as Locale)}</span>
                                        {log.severity !== "info" && (
                                            <Badge tone={SEVERITY_TONE[log.severity]} size="sm">
                                                {t(`audit.severity.${log.severity}`)}
                                            </Badge>
                                        )}
                                        {log.correlationId && (
                                            <span className="font-mono text-gray-400" title={t("audit.correlationId")}>
                                                #{log.correlationId.slice(0, 8)}
                                            </span>
                                        )}
                                        {log.ipAddress && <span className="font-mono text-gray-400">{log.ipAddress}</span>}
                                    </div>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <p className="mt-1 text-xs text-gray-400 break-words line-clamp-2">
                                            {summarizeAuditDetails(log.details)}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}
