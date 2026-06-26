"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, RefreshCw, Wallet, Ban } from "lucide-react";
import api from "@/app/lib/api";
import {
    Badge,
    Button,
    EmptyState,
    Pagination,
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
import { PaymentModal } from "@/components/payments/PaymentModal";
import { ExportButton } from "@/components/system/ExportButton";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import { listPayments, voidPayment } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { Invoice, PaymentRecord } from "@/types";

function invoiceLabel(p: PaymentRecord): string {
    if (typeof p.invoice === "object" && p.invoice) return p.invoice.invoiceNumber;
    return "—";
}
function companyLabel(p: PaymentRecord): string {
    if (typeof p.company === "object" && p.company) return p.company.name;
    return "—";
}

export default function PaymentsPage() {
    const { t, locale } = useAdminI18n();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listPayments({ page });
            setPayments(res.data || []);
            setTotalPages(res.pagination?.pages || 1);
        } catch (err) {
            console.error(err);
            toast.error(t("payments.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [page, t]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // Load invoices for the payment modal picker (issued/unpaid first).
    useEffect(() => {
        let cancelled = false;
        api.get("/v1/invoices")
            .then((res) => {
                if (cancelled) return;
                const list: Invoice[] = res.data?.data || [];
                setInvoices(list.filter((i) => i.status !== "cancelled" && i.paymentStatus !== "paid"));
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    const handleVoid = async (p: PaymentRecord) => {
        if (!confirm(t("payments.confirmVoid"))) return;
        try {
            await voidPayment(p._id);
            toast.success(t("payments.toasts.voided"));
            await fetchPayments();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || t("payments.toasts.voidFailed"));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("payments.pageTitle")}
                description={t("payments.pageSubtitle")}
                actions={
                    <>
                        <ExportButton dataset="payments" />
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchPayments}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                            {t("payments.record")}
                        </Button>
                    </>
                }
            />

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("payments.table.date")}</TH>
                            <TH>{t("payments.table.invoice")}</TH>
                            <TH>{t("payments.table.company")}</TH>
                            <TH>{t("payments.table.method")}</TH>
                            <TH align="end">{t("payments.table.amount")}</TH>
                            <TH>{t("payments.table.status")}</TH>
                            <TH align="end">{t("payments.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={7} />
                        ) : payments.length === 0 ? (
                            <TR>
                                <TD colSpan={7}>
                                    <EmptyState
                                        icon={<Wallet size={18} />}
                                        title={t("payments.empty")}
                                        description={t("payments.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            payments.map((p) => (
                                <TR key={p._id} className={p.status === "voided" ? "opacity-60" : ""}>
                                    <TD muted>{formatDate(p.paidAt, locale as Locale)}</TD>
                                    <TD className="font-mono">{invoiceLabel(p)}</TD>
                                    <TD>{companyLabel(p)}</TD>
                                    <TD muted>{t(`payments.methods.${p.method}`)}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(p.amount, "ILS", locale as Locale)}
                                    </TD>
                                    <TD>
                                        <Badge tone={p.status === "voided" ? "danger" : "success"}>
                                            {t(`payments.recordStatus.${p.status}`)}
                                        </Badge>
                                    </TD>
                                    <TD align="end">
                                        {p.status === "posted" && (
                                            <Button size="sm" variant="ghost" iconStart={<Ban size={14} />} onClick={() => handleVoid(p)}
                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                {t("payments.void")}
                                            </Button>
                                        )}
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            <PaymentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                invoices={invoices}
                onPosted={fetchPayments}
            />
        </div>
    );
}
