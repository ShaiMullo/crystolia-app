"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
    Activity,
    AlertTriangle,
    Boxes,
    Database,
    FileWarning,
    Play,
    PlugZap,
    RefreshCw,
    MessageCircle,
    ShieldCheck,
    Smartphone,
    Wallet,
} from "lucide-react";
import {
    Badge,
    Button,
    Card,
    CardTitle,
    LoadingState,
    PageHeader,
    StatCard,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { OperationalError } from "@/components/system/OperationalError";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import {
    getSystemHealth,
    listJobs,
    runJobNow,
    setJobEnabled,
    type ScheduledJobRow,
    type SystemHealth,
} from "@/lib/systemApi";
import type { Locale } from "@/i18n";

const SEVERITY_TONE = { healthy: "success", warning: "warning", critical: "danger" } as const;

function HealthRing({ score, severity }: { score: number; severity: "healthy" | "warning" | "critical" }) {
    const color = severity === "healthy" ? "#10b981" : severity === "warning" ? "#f59e0b" : "#ef4444";
    return (
        <div className="relative h-24 w-24">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
                <circle
                    cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 264} 264`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-semibold tabular text-gray-900 dark:text-gray-50">{score}</span>
            </div>
        </div>
    );
}

export default function SystemPage() {
    const { t, locale } = useAdminI18n();
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [jobs, setJobs] = useState<ScheduledJobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [busyJob, setBusyJob] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [h, j] = await Promise.all([getSystemHealth(), listJobs()]);
            setHealth(h);
            setJobs(j);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleRunJob = async (key: string) => {
        setBusyJob(key);
        try {
            const result = await runJobNow(key);
            if (result.skipped) toast(t("jobs.alreadyRunning"));
            else if (result.ok) toast.success(t("jobs.ranOk"));
            else toast.error(result.error || t("jobs.runFailed"));
            await fetchAll();
        } catch {
            toast.error(t("jobs.runFailed"));
        } finally {
            setBusyJob(null);
        }
    };

    const handleToggle = async (job: ScheduledJobRow) => {
        try {
            await setJobEnabled(job.key, !job.enabled);
            await fetchAll();
        } catch {
            toast.error(t("jobs.toggleFailed"));
        }
    };

    if (loading) return <LoadingState label={t("system.loading")} />;
    if (error || !health) {
        return (
            <div className="space-y-6">
                <PageHeader title={t("system.pageTitle")} description={t("system.pageSubtitle")} />
                <OperationalError service="system.health" onRetry={fetchAll} />
            </div>
        );
    }

    // Backward-compatible during rolling deploys where the frontend may become
    // ready a few seconds before the backend exposes notification readiness.
    const notifications = health.notifications ?? {
        recipientConfigured: false,
        whatsappConfigured: false,
        smsConfigured: false,
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("system.pageTitle")}
                description={t("system.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchAll}>
                            {t("common.refresh")}
                        </Button>
                        <Link href="/admin/system/go-live">
                            <Button variant="outline" size="sm" iconStart={<ShieldCheck size={14} />}>
                                {t("system.goLiveLink")}
                            </Button>
                        </Link>
                        <Link href="/admin/system/backups">
                            <Button variant="outline" size="sm" iconStart={<Database size={14} />}>
                                {t("backups.title")}
                            </Button>
                        </Link>
                        <Link href="/admin/system/integrations/comax">
                            <Button variant="outline" size="sm" iconStart={<PlugZap size={14} />}>
                                {t("nav.integrations")}
                            </Button>
                        </Link>
                    </>
                }
            />

            {/* Health score + replica diagnostics */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="flex items-center gap-4">
                    <HealthRing score={health.healthScore} severity={health.severity} />
                    <div>
                        <CardTitle>{t("health.title")}</CardTitle>
                        <Badge tone={SEVERITY_TONE[health.severity]} className="mt-2">
                            {t(`health.severity.${health.severity}`)}
                        </Badge>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t("health.checkedAt")}: {formatDateTime(health.checkedAt, locale as Locale)}
                        </p>
                    </div>
                </Card>
                <Card className="lg:col-span-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-gray-400" />
                        <CardTitle>{t("monitoring.diagnostics")}</CardTitle>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">{t("monitoring.topology")}</dt>
                            <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-50">{health.diagnostics.topology}</dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">{t("monitoring.transactions")}</dt>
                            <dd className="mt-1">
                                <Badge tone={health.diagnostics.transactionsSupported ? "success" : "warning"}>
                                    {health.diagnostics.transactionsSupported
                                        ? t("monitoring.txnSupported")
                                        : t("monitoring.txnFallback")}
                                </Badge>
                            </dd>
                        </div>
                    </dl>
                    {!health.diagnostics.transactionsSupported && (
                        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                            {t("monitoring.standaloneWarning")}
                        </p>
                    )}
                </Card>
            </div>

            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-gray-100 p-2 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <Smartphone size={18} />
                        </div>
                        <div>
                            <CardTitle>{t("monitoring.leadNotifications")}</CardTitle>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {notifications.recipientConfigured
                                    ? t("monitoring.notificationRecipientReady")
                                    : t("monitoring.notificationRecipientMissing")}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge tone={notifications.whatsappConfigured ? "success" : "neutral"}>
                            <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} /> WhatsApp · {t(notifications.whatsappConfigured ? "monitoring.ready" : "monitoring.off")}</span>
                        </Badge>
                        <Badge tone={notifications.smsConfigured ? "success" : "neutral"}>
                            <span className="inline-flex items-center gap-1.5"><Smartphone size={13} /> SMS · {t(notifications.smsConfigured ? "monitoring.ready" : "monitoring.off")}</span>
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Operational KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label={t("health.reconciliation")} value={health.reconciliation.healthScore} icon={<Activity size={18} />}
                    accent={health.reconciliation.severity === "healthy" ? "success" : health.reconciliation.severity === "warning" ? "warning" : "danger"} />
                <StatCard label={t("health.failedJobs")} value={health.failedJobs} icon={<AlertTriangle size={18} />}
                    accent={health.failedJobs > 0 ? "danger" : "default"} />
                <StatCard label={t("health.lowStock")} value={health.lowStockCount} icon={<Boxes size={18} />}
                    accent={health.lowStockCount > 0 ? "warning" : "default"} />
                <StatCard label={t("health.overdueInvoices")} value={health.overdueInvoices} icon={<FileWarning size={18} />}
                    accent={health.overdueInvoices > 0 ? "warning" : "default"} />
                <StatCard label={t("health.paymentMismatch")} value={health.paymentMismatchCount} icon={<Wallet size={18} />}
                    accent={health.paymentMismatchCount > 0 ? "danger" : "default"} />
            </div>

            {/* Scheduled jobs */}
            <Card padded={false}>
                <div className="flex items-center justify-between gap-3 px-5 pt-5">
                    <CardTitle>{t("jobs.title")}</CardTitle>
                </div>
                <div className="mt-3">
                    <TableContainer className="!border-0">
                        <Table>
                            <THead>
                                <TR>
                                    <TH>{t("jobs.table.name")}</TH>
                                    <TH>{t("jobs.table.status")}</TH>
                                    <TH>{t("jobs.table.lastRun")}</TH>
                                    <TH align="center">{t("jobs.table.runs")}</TH>
                                    <TH align="center">{t("jobs.table.failures")}</TH>
                                    <TH align="end">{t("jobs.table.actions")}</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {jobs.map((job) => (
                                    <TR key={job.key}>
                                        <TD>
                                            <div className="font-medium text-gray-900 dark:text-gray-50">{job.name}</div>
                                            {job.description && <div className="text-xs text-gray-400">{job.description}</div>}
                                        </TD>
                                        <TD>
                                            <Badge tone={
                                                job.lastStatus === "success" ? "success"
                                                    : job.lastStatus === "failed" ? "danger"
                                                    : job.lastStatus === "running" ? "info" : "neutral"
                                            }>
                                                {t(`jobs.status.${job.lastStatus}`)}
                                            </Badge>
                                        </TD>
                                        <TD muted>{job.lastRunAt ? formatDateTime(job.lastRunAt, locale as Locale) : "—"}</TD>
                                        <TD align="center" muted className="tabular">{job.runCount}</TD>
                                        <TD align="center" className="tabular">
                                            <span className={job.failureCount > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                                                {job.failureCount}
                                            </span>
                                        </TD>
                                        <TD align="end">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleToggle(job)}>
                                                    {job.enabled ? t("jobs.disable") : t("jobs.enable")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    iconStart={<Play size={13} />}
                                                    loading={busyJob === job.key}
                                                    onClick={() => handleRunJob(job.key)}
                                                >
                                                    {t("jobs.runNow")}
                                                </Button>
                                            </div>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    </TableContainer>
                </div>
            </Card>

            {/* Recent failures */}
            {health.recentFailures.length > 0 && (
                <Card>
                    <CardTitle>{t("monitoring.recentFailures")}</CardTitle>
                    <ul className="mt-3 space-y-2">
                        {health.recentFailures.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                                <div>
                                    <span className="font-mono text-gray-700 dark:text-gray-200">{f.jobKey}</span>
                                    <span className="text-gray-400"> · {formatDateTime(f.createdAt, locale as Locale)}</span>
                                    {f.error && <p className="text-xs text-red-600">{f.error}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
