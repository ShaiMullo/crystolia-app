"use client";

// Admin → System → Go-Live Readiness: one screen answering "can this
// system run real daily business today, and if not — what exactly is
// missing and where do I fix it?". Strictly secret-free: the endpoint
// returns booleans/counts/SKUs only.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import api from "@/app/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
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
import {
    getGoLiveReadiness,
    getPaymentStatus,
    verifyBankDetails,
    verifyIntegration,
    type GoLiveReadiness,
    type IntegrationState,
    type IntegrationVerificationRecord,
} from "@/lib/systemApi";
import { Input } from "@/components/ui";

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

interface BankDetailsSummary {
    bankName?: string;
    branch?: string;
    accountNumber?: string;
    accountName?: string;
    iban?: string;
    swift?: string;
    bankAddress?: string;
}

/**
 * Owner attestation dialog: shows the CURRENTLY saved bank details for
 * review against the official document, then requires the account password
 * (re-authentication) plus an explicit confirmation. The submitted
 * fingerprint pins exactly what was reviewed — if the details change
 * mid-review the backend answers 409 and nothing is attested.
 */
function BankVerifyModal({ open, onClose, onVerified }: {
    open: boolean;
    onClose: () => void;
    onVerified: () => void;
}) {
    const { t } = useAdminI18n();
    const [details, setDetails] = useState<BankDetailsSummary | null>(null);
    const [fingerprint, setFingerprint] = useState("");
    const [password, setPassword] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (!open) return;
        setPassword("");
        setConfirmed(false);
        setLoadError(false);
        setDetails(null);
        (async () => {
            try {
                const [settingsRes, status] = await Promise.all([
                    api.get("/v1/settings"),
                    getPaymentStatus(),
                ]);
                setDetails(settingsRes.data.data?.paymentOptions?.bankTransfer ?? null);
                setFingerprint(status.bankVerification.currentFingerprint);
            } catch {
                setLoadError(true);
            }
        })();
    }, [open]);

    if (!open) return null;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await verifyBankDetails(password, fingerprint);
            toast.success(t("system.goLive.bankVerify.success"));
            onVerified();
            onClose();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t("system.goLive.bankVerify.failed")));
        } finally {
            setSubmitting(false);
        }
    };

    const rows: Array<[string, string | undefined, boolean]> = details ? [
        [t("settings.payments.bankName"), details.bankName, false],
        [t("settings.payments.branch"), details.branch, false],
        [t("settings.payments.accountNumber"), details.accountNumber, false],
        [t("settings.payments.accountName"), details.accountName, false],
        ["IBAN", details.iban, true],
        ["SWIFT/BIC", details.swift, true],
        [t("settings.payments.bankAddress"), details.bankAddress, false],
    ] : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("system.goLive.bankVerify.title")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("system.goLive.bankVerify.intro")}</p>

                {loadError ? (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t("system.goLive.bankVerify.loadFailed")}</p>
                ) : !details ? (
                    <div className="mt-4"><LoadingState /></div>
                ) : (
                    <>
                        <dl className="mt-4 space-y-1 rounded-xl bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {rows.filter(([, value]) => value).map(([label, value, ltr]) => (
                                <div key={label} className="flex justify-between gap-3">
                                    <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                                    <dd dir={ltr ? "ltr" : undefined} className="font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t("system.goLive.bankVerify.reviewHint")}</p>

                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {t("system.goLive.bankVerify.passwordLabel")}
                            </label>
                            <Input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <label className="mt-3 flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded accent-yellow-500"
                            />
                            {t("system.goLive.bankVerify.confirmLabel")}
                        </label>
                    </>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={!details || !password || !confirmed || submitting}
                    >
                        {t("system.goLive.bankVerify.submit")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Explicit confirmation before an integration verification: the owner is
 *  told a REAL message will be sent before anything happens. */
function ConfirmSendModal({ open, warning, busy, onConfirm, onClose }: {
    open: boolean;
    warning: string;
    busy: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const { t } = useAdminI18n();
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("system.goLive.verifyConfirmTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{warning}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
                    <Button onClick={onConfirm} loading={busy} disabled={busy}>
                        {t("system.goLive.verifyConfirmSend")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function GoLivePage() {
    const { t } = useAdminI18n();
    const [data, setData] = useState<GoLiveReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const [pendingVerify, setPendingVerify] = useState<"operational_email" | "admin_sms" | null>(null);
    const [verifyBusy, setVerifyBusy] = useState(false);

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
    const bankVerification = data.payments.bankVerification;

    const runVerify = async () => {
        if (!pendingVerify) return;
        setVerifyBusy(true);
        try {
            const outcome = await verifyIntegration(pendingVerify);
            if (outcome.result === "success") {
                toast.success(t("system.goLive.verifySuccess"));
            } else {
                toast.error(`${t("system.goLive.verifyFailed")}: ${t(`system.goLive.failureCategories.${outcome.failureCategory || "unknown"}`)}`);
            }
            setPendingVerify(null);
            await fetchAll();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t("system.goLive.verifyFailed")));
        } finally {
            setVerifyBusy(false);
        }
    };

    const verificationDetail = (state: IntegrationState, record?: IntegrationVerificationRecord): string => {
        const base = t(`system.goLive.states.${state}`);
        if (state === "failed" && record?.failureCategory) {
            return `${base} — ${t(`system.goLive.failureCategories.${record.failureCategory}`)}`;
        }
        if ((state === "verified" || state === "verification_expired") && record?.verifiedAt) {
            return `${base} — ${new Date(record.verifiedAt).toLocaleDateString()}`;
        }
        return base;
    };

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
                    {/* Green ONLY when the owner's recorded attestation
                        fingerprint matches the currently saved fields. */}
                    <StatusRow
                        ok={bankVerification === "verified"}
                        warn={bankVerification === "owner_confirmation_required"}
                        label={t("system.goLive.bankTransfer")}
                        detail={bankVerification === "verified"
                            ? `${t("system.goLive.bankVerifiedDetail")}${data.payments.bankVerifiedAt ? ` — ${new Date(data.payments.bankVerifiedAt).toLocaleDateString()}` : ""}`
                            : bankVerification === "owner_confirmation_required"
                                ? t("system.goLive.bankOwnerVerificationRequired")
                                : (bank?.issues.join("; ") || t("system.goLive.bankMissing"))}
                        actionHref="/admin/settings"
                        actionLabel={t("system.goLive.openSettings")}
                    />
                    {bankVerification === "owner_confirmation_required" && (
                        <div className="mt-2">
                            <Button size="sm" onClick={() => setBankModalOpen(true)} iconStart={<ShieldCheck size={14} />}>
                                {t("system.goLive.verifyBankDetails")}
                            </Button>
                        </div>
                    )}
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
                        // Green requires a REAL recorded verification (an
                        // owner-triggered test send, or a completed OAuth
                        // sign-in) — config presence stays amber.
                        const recordKey = key === "email" ? "operational_email"
                            : key === "adminSmsRecipient" || key === "smsTransport" ? "admin_sms"
                                : key === "googleOauth" ? "google_oauth" : null;
                        const record = recordKey ? data.integrationVerifications?.[recordKey] : undefined;
                        const verifyKey = key === "email" ? "operational_email" as const
                            : key === "adminSmsRecipient" ? "admin_sms" as const : null;
                        return (
                            <div key={key}>
                                <StatusRow
                                    ok={state === "verified"}
                                    warn={state !== "failed"}
                                    label={label}
                                    detail={verificationDetail(state, record)}
                                />
                                {verifyKey && state !== "not_configured" && (
                                    <div className="mb-2 mt-1">
                                        <Button size="sm" variant="outline" onClick={() => setPendingVerify(verifyKey)}>
                                            {verifyKey === "operational_email"
                                                ? t("system.goLive.verifyEmailBtn")
                                                : t("system.goLive.verifySmsBtn")}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <BankVerifyModal
                open={bankModalOpen}
                onClose={() => setBankModalOpen(false)}
                onVerified={fetchAll}
            />
            <ConfirmSendModal
                open={pendingVerify !== null}
                warning={pendingVerify === "admin_sms"
                    ? t("system.goLive.verifySendWarningSms")
                    : t("system.goLive.verifySendWarningEmail")}
                busy={verifyBusy}
                onConfirm={runVerify}
                onClose={() => setPendingVerify(null)}
            />

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
