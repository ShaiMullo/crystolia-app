"use client";

import { Activity } from "lucide-react";
import {
    EmptyState,
    Pagination,
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
import { formatDateTime, summarizeAuditDetails } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { AuditLog } from "@/types";

interface AuditTabProps {
    logs: AuditLog[];
    loading: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function AuditTab({ logs, loading, page, totalPages, onPageChange }: AuditTabProps) {
    const { t, locale } = useAdminI18n();

    return (
        <div className="space-y-4">
            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("audit.table.date")}</TH>
                            <TH>{t("audit.table.user")}</TH>
                            <TH>{t("audit.table.action")}</TH>
                            <TH>{t("audit.table.entity")}</TH>
                            <TH>{t("audit.table.details")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={5} />
                        ) : logs.length === 0 ? (
                            <TR>
                                <TD colSpan={5}>
                                    <EmptyState icon={<Activity size={18} />} title={t("audit.empty")} />
                                </TD>
                            </TR>
                        ) : (
                            logs.map((log) => (
                                <TR key={log._id}>
                                    <TD muted>{formatDateTime(log.createdAt, locale as Locale)}</TD>
                                    <TD className="font-medium">{log.performedBy?.email || t("audit.system")}</TD>
                                    <TD muted><span className="font-mono">{log.action}</span></TD>
                                    <TD muted>
                                        {log.entity} / <span className="font-mono">{log.entityId?.substring(0, 8)}…</span>
                                    </TD>
                                    <TD muted className="max-w-xs">
                                        <span className="truncate block">{summarizeAuditDetails(log.details)}</span>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
    );
}
