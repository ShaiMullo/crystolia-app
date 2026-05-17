"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Database, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import {
    Badge,
    Button,
    EmptyState,
    PageHeader,
    Table,
    TableContainer,
    TableSkeleton,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import {
    createBackup,
    listBackups,
    verifyBackup,
    type BackupManifestRecord,
} from "@/lib/systemApi";
import type { Locale } from "@/i18n";

const STATUS_TONE = {
    pending: "neutral",
    completed: "info",
    verified: "success",
    failed: "danger",
} as const;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupsPage() {
    const router = useRouter();
    const { t, locale } = useAdminI18n();
    const [backups, setBackups] = useState<BackupManifestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            setBackups(await listBackups());
        } catch {
            toast.error(t("backups.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            await createBackup(`manual-${new Date().toISOString().slice(0, 16)}`);
            toast.success(t("backups.toasts.created"));
            await fetchBackups();
        } catch {
            toast.error(t("backups.toasts.createFailed"));
        } finally {
            setCreating(false);
        }
    };

    const handleVerify = async (id: string) => {
        setVerifyingId(id);
        try {
            const result = await verifyBackup(id);
            toast.success(t("backups.toasts.verified", { drift: result.drift }));
            await fetchBackups();
        } catch {
            toast.error(t("backups.toasts.verifyFailed"));
        } finally {
            setVerifyingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("backups.pageTitle")}
                description={t("backups.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />} onClick={() => router.push("/admin/system")}>
                            {t("backups.back")}
                        </Button>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchBackups}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} loading={creating} onClick={handleCreate}>
                            {t("backups.create")}
                        </Button>
                    </>
                }
            />

            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                {t("backups.metadataNote")}
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("backups.table.label")}</TH>
                            <TH>{t("backups.table.status")}</TH>
                            <TH align="end">{t("backups.table.documents")}</TH>
                            <TH align="end">{t("backups.table.size")}</TH>
                            <TH>{t("backups.table.created")}</TH>
                            <TH align="end">{t("backups.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={6} />
                        ) : backups.length === 0 ? (
                            <TR>
                                <TD colSpan={6}>
                                    <EmptyState
                                        icon={<Database size={18} />}
                                        title={t("backups.empty")}
                                        description={t("backups.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            backups.map((b) => (
                                <TR key={b._id}>
                                    <TD className="font-medium">{b.label}</TD>
                                    <TD>
                                        <Badge tone={STATUS_TONE[b.status]}>{t(`backups.status.${b.status}`)}</Badge>
                                    </TD>
                                    <TD align="end" muted className="tabular">{b.totalDocuments}</TD>
                                    <TD align="end" muted className="tabular">{formatBytes(b.sizeEstimateBytes)}</TD>
                                    <TD muted>{formatDateTime(b.createdAt, locale as Locale)}</TD>
                                    <TD align="end">
                                        {b.status !== "failed" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                iconStart={<ShieldCheck size={13} />}
                                                loading={verifyingId === b._id}
                                                onClick={() => handleVerify(b._id)}
                                            >
                                                {t("backups.verify")}
                                            </Button>
                                        )}
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>
        </div>
    );
}
