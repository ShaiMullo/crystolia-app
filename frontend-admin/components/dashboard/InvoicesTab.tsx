"use client";

import { FileText, FileDown } from "lucide-react";
import {
    Button,
    EmptyState,
    Select,
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Invoice, InvoiceStatus } from "@/types";

interface InvoicesTabProps {
    invoices: Invoice[];
    loading: boolean;
    statusFilter: InvoiceStatus | "";
    onStatusFilterChange: (value: InvoiceStatus | "") => void;
    onStatusChange: (invoiceId: string, newStatus: InvoiceStatus) => void;
    onIssue: (invoiceId: string) => void;
    savingInvoiceIds: Set<string>;
    issuingInvoiceIds: Set<string>;
}

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

const getCompanyName = (inv: Invoice): string => {
    if (!inv.company) return "—";
    if (typeof inv.company === "object") return inv.company.name;
    return inv.company;
};

export function InvoicesTab({
    invoices,
    loading,
    statusFilter,
    onStatusFilterChange,
    onStatusChange,
    onIssue,
    savingInvoiceIds,
    issuingInvoiceIds,
}: InvoicesTabProps) {
    const { t, locale } = useAdminI18n();
    const filtered = statusFilter ? invoices.filter((inv) => inv.status === statusFilter) : invoices;

    return (
        <div className="space-y-4">
            <div>
                <Select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as InvoiceStatus | "")}
                    className="sm:w-48"
                >
                    <option value="">{t("leads.filters.allStatuses")}</option>
                    {INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`invoiceStatus.${s}`)}</option>
                    ))}
                </Select>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("invoices.table.invoiceNumber")}</TH>
                            <TH>{t("invoices.table.company")}</TH>
                            <TH align="end">{t("invoices.table.amount")}</TH>
                            <TH>{t("invoices.table.status")}</TH>
                            <TH>{t("invoices.table.issued")}</TH>
                            <TH>{t("invoices.table.due")}</TH>
                            <TH align="end">{t("invoices.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={7} />
                        ) : filtered.length === 0 ? (
                            <TR>
                                <TD colSpan={7}>
                                    <EmptyState icon={<FileText size={18} />} title={t("invoices.empty")} />
                                </TD>
                            </TR>
                        ) : (
                            filtered.map((inv) => (
                                <TR key={inv._id}>
                                    <TD className="font-mono font-medium">{inv.invoiceNumber}</TD>
                                    <TD>{getCompanyName(inv)}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(inv.totalAmount, "ILS", locale as Locale)}
                                    </TD>
                                    <TD>
                                        <Select
                                            pill
                                            value={inv.status}
                                            disabled={savingInvoiceIds.has(inv._id)}
                                            onChange={(e) => onStatusChange(inv._id, e.target.value as InvoiceStatus)}
                                            className="!h-6 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                        >
                                            {INVOICE_STATUSES.map((s) => (
                                                <option key={s} value={s}>{t(`invoiceStatus.${s}`)}</option>
                                            ))}
                                        </Select>
                                    </TD>
                                    <TD muted>{formatDate(inv.issuedAt, locale as Locale)}</TD>
                                    <TD muted>{formatDate(inv.dueDate, locale as Locale)}</TD>
                                    <TD align="end">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status === "draft" && (
                                                <Button
                                                    size="sm"
                                                    variant="success"
                                                    loading={issuingInvoiceIds.has(inv._id)}
                                                    onClick={() => onIssue(inv._id)}
                                                >
                                                    {issuingInvoiceIds.has(inv._id) ? t("invoices.issuing") : t("invoices.issueAndPdf")}
                                                </Button>
                                            )}
                                            {inv.pdfUrl && (
                                                <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="outline" iconStart={<FileDown size={14} />}>
                                                        {t("invoices.pdf")}
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
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
