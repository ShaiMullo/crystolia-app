"use client";

// Admin → System → Go-Live Readiness: one screen answering "can this
// system run real daily business today, and if not — what exactly is
// missing and where do I fix it?". Strictly secret-free: the endpoint
// returns booleans/counts/SKUs only.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Banknote,
    Boxes,
    CheckCircle2,
    CreditCard,
    Database,
    ExternalLink,
    PlugZap,
    RefreshCw,
    ShieldCheck,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import {
    Badge,
    Button,
    Card,
    CardTitle,
    LoadingState,
    PageHeader,
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
import { getGoLiveReadiness, type GoLiveReadiness, type IntegrationState } from "@/lib/systemApi";

type Tone = "success" | "warning" | "danger";

function StatusRow({ ok, warn, label, detail, actionHref, actionLabel }: {
    ok: boolean;
    warn?: boolean;
    label: string;
    detail?: string;
    actionHref?: string;
    actionLabel?: string;
}) {
    const tone: Tone = ok ? "success" : warn ? "warning" : "danger";
    const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
    const iconColor = ok ? "text-emerald-500" : warn ? "text-amber-500" : "text-red-500";
    return (
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
            <div className="flex items-start gap-3">
                <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                    {detail && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Badge tone={tone}>{ok ? "OK" : warn ? "!" : "✕"}</Badge>
                {actionHref && actionLabel && (
                    <Link
                        href={actionHref}
                        className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 hover:underline dark:text-yellow-400"
                    >
                        {actionLabel}
                        <ExternalLink size={12} />
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function GoLivePage() {
    const { t } = useAdminI18n();
    const [data, setData] = useState<GoLiveReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await getGoLiveReadiness());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    if (loading) return <LoadingState />;
    if (error || !data) {
        return (
            <div className="space-y-6">
                <PageHeader title={t("system.goLive.title")} description={t("system.goLive.subtitle")} />
                <OperationalError service="system.goLive" onRetry={fetchAll} />
            </div>
        );
    }

    const bank = data.payments.methods.find((m) => m.method === "bank_transfer");
    const card = data.payments.methods.find((m) => m.method === "credit_card");
    const integrations = data.integrations;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("system.goLive.title")}
                description={t("system.goLive.subtitle")}
                actions={(
                    <Button variant="secondary" onClick={fetchAll} iconStart={<RefreshCw size={14} />}>
                        {t("common.refresh")}
                    </Button>
                )}
            />

            <Card>
                <CardTitle><span className="inline-flex items-center gap-2"><Database size={16} />{t("system.goLive.platform")}</span></CardTitle>
                <div className="mt-3">
                    <StatusRow
                        ok={data.database.transactionsReady}
                        label={t("system.goLive.transactions")}
                        detail={data.database.transactionsReady
                            ? `${t("system.goLive.topology")}: ${data.database.topology}`
                            : data.database.reason}
                    />
                    <StatusRow
                        ok={data.criticalIndexes.invoiceOrderUnique.ready}
                        label={t("system.goLive.invoiceIndex")}
                        detail={data.criticalIndexes.invoiceOrderUnique.reason}
                    />
                </div>
            </Card>

            <Card>
                <CardTitle><span className="inline-flex items-center gap-2"><Banknote size={16} />{t("system.goLive.payments")}</span></CardTitle>
                <div className="mt-3">
                    {/* "Configured" is never shown green: non-empty fields are
                        not verified real details until the owner confirms. */}
                    <StatusRow
                        ok={false}
                        warn={Boolean(bank?.configured)}
                        label={t("system.goLive.bankTransfer")}
                        detail={bank?.configured
                            ? t("system.goLive.bankOwnerVerificationRequired")
                            : (bank?.issues.join("; ") || t("system.goLive.bankMissing"))}
                        actionHref="/admin/settings"
                        actionLabel={t("system.goLive.openSettings")}
                    />
                    <StatusRow
                        ok={false}
                        warn
                        label={t("system.goLive.creditCard")}
                        detail={t("system.goLive.creditCardUnavailable")}
                        actionHref="/admin/settings"
                        actionLabel={t("system.goLive.openSettings")}
                    />
                    {card?.enabled && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            <CreditCard size={12} className="mb-0.5 inline" />{" "}
                            {t("system.goLive.creditCardEnabledWarning")}
                        </p>
                    )}
                </div>
            </Card>

            <Card>
                <CardTitle><span className="inline-flex items-center gap-2"><Boxes size={16} />{t("system.goLive.stock")}</span></CardTitle>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("system.goLive.stockSummary")
                        .replace("{ready}", String(data.stock.readyProducts))
                        .replace("{tracked}", String(data.stock.trackedProducts))
                        .replace("{active}", String(data.stock.activeProducts))}
                </p>
                <div className="mt-3">
                    <StatusRow
                        ok={data.stock.ready}
                        label={t("system.goLive.stockReady")}
                        detail={data.stock.ready ? undefined : t("system.goLive.stockNotReadyHint")}
                        actionHref="/admin/inventory"
                        actionLabel={t("system.goLive.openInventory")}
                    />
                </div>
                {data.stock.notReady.length > 0 && (
                    <TableContainer className="mt-3">
                        <Table>
                            <THead>
                                <TR>
                                    <TH>{t("system.goLive.sku")}</TH>
                                    <TH>{t("system.goLive.product")}</TH>
                                    <TH>{t("system.goLive.status")}</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {data.stock.notReady.map((item) => (
                                    <TR key={`${item.sku}-${item.name}`}>
                                        <TD className="tabular">{item.sku ?? "—"}</TD>
                                        <TD>{item.name}</TD>
                                        <TD>
                                            <Badge tone="danger">
                                                {item.status === "NO_INVENTORY_ROW"
                                                    ? t("system.goLive.noInventoryRow")
                                                    : t("system.goLive.zeroAvailable")}
                                            </Badge>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    </TableContainer>
                )}
            </Card>

            <Card>
                <CardTitle><span className="inline-flex items-center gap-2"><PlugZap size={16} />{t("system.goLive.integrations")}</span></CardTitle>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("system.goLive.integrationsHonesty")}</p>
                <div className="mt-3">
                    {([
                        ["email", t("system.goLive.email")],
                        ["smsTransport", t("system.goLive.smsTransport")],
                        ["adminSmsRecipient", t("system.goLive.adminSmsRecipient")],
                        ["googleOauth", t("system.goLive.googleOauth")],
                        ["greenInvoice", t("system.goLive.accounting")],
                        ["errorTracking", t("system.goLive.errorTracking")],
                        ["uptimeAlerts", t("system.goLive.uptimeAlerts")],
                    ] as Array<[keyof typeof integrations, string]>).map(([key, label]) => {
                        const state = integrations[key] as IntegrationState;
                        // Only a real verification could ever be green; config
                        // presence is always amber ("unverified").
                        return (
                            <StatusRow
                                key={key}
                                ok={state === "verified"}
                                warn={state !== "failed"}
                                label={label}
                                detail={t(`system.goLive.states.${state}`)}
                            />
                        );
                    })}
                </div>
            </Card>

            <Card>
                <CardTitle><span className="inline-flex items-center gap-2"><ShieldCheck size={16} />{t("system.goLive.operations")}</span></CardTitle>
                <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        • {t("system.goLive.backupsLine").replace("{workflow}", data.operations.backups.workflow)}
                        {" — "}{t(`system.goLive.opStatus.${data.operations.backups.status}`)}
                    </p>
                    <p>
                        • {t("system.goLive.uptimeLine").replace("{workflow}", data.operations.uptimeMonitor.workflow)}
                        {" — "}{t(`system.goLive.opStatus.${data.operations.uptimeMonitor.status}`)}
                    </p>
                    <p className="text-xs text-gray-400">{t("system.goLive.checkedAt")}: {new Date(data.checkedAt).toLocaleString()}</p>
                </div>
            </Card>
        </div>
    );
}
