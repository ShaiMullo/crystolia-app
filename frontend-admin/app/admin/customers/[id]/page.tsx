"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
    ArrowLeft,
    Pencil,
    MessageSquare,
    Activity,
    FileText,
    ShoppingBag,
    Inbox,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/app/lib/api";
import {
    Badge,
    Button,
    Card,
    CardTitle,
    EmptyState,
    Input,
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
import {
    CustomerStatusBadge,
    InvoiceStatusBadge,
    LeadStatusBadge,
    OrderStatusBadge,
} from "@/components/dashboard/StatusBadges";
import CustomerEditModal, { CustomerEditPayload } from "@/components/customers/CustomerEditModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, formatDateTime, shortId } from "@/lib/format";
import { getCustomer, updateCustomer } from "@/lib/customersApi";
import type { Locale } from "@/i18n";
import type {
    Customer,
    CustomerDetail,
    CustomerTimelineEvent,
    User,
} from "@/types";

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();
    const customerId = params?.id as string;

    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<User[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const fetchCustomer = useCallback(async () => {
        if (!customerId) return;
        try {
            const data = await getCustomer(customerId);
            setCustomer(data);
        } catch (err) {
            console.error(err);
            toast.error(t("customers.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [customerId, t]);

    useEffect(() => {
        if (user) fetchCustomer();
    }, [user, fetchCustomer]);

    useEffect(() => {
        let cancelled = false;
        api.get("/users")
            .then((res) => {
                if (cancelled) return;
                const list: User[] = res.data?.data || [];
                setAgents(list.filter((u) => u.role === "agent" || u.role === "admin"));
            })
            .catch(() => {
                // non-fatal
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSave = async (payload: CustomerEditPayload) => {
        if (!customer) return;
        try {
            await updateCustomer(customer._id, payload);
            toast.success(t("customers.toasts.updated"));
            await fetchCustomer();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("customers.toasts.updateFailed"));
            throw err;
        }
    };

    const handleAddNote = async () => {
        if (!customer || !noteText.trim()) return;
        setSavingNote(true);
        try {
            await updateCustomer(customer._id, { note: noteText.trim() });
            toast.success(t("customers.toasts.noteAdded"));
            setNoteText("");
            await fetchCustomer();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("customers.toasts.noteFailed"));
        } finally {
            setSavingNote(false);
        }
    };

    if (loading) return <LoadingState label={t("customers.detail.loading")} />;

    if (!customer) {
        return (
            <EmptyState
                icon={<FileText size={18} />}
                title={t("customers.detail.notFound")}
                action={
                    <Button variant="outline" onClick={() => router.push("/admin/customers")} iconStart={<ArrowLeft size={14} />}>
                        {t("common.back")}
                    </Button>
                }
            />
        );
    }

    const company = typeof customer.company === "object" ? customer.company : null;
    const agentName =
        typeof customer.assignedTo === "object" && customer.assignedTo
            ? customer.assignedTo.name || customer.assignedTo.email
            : null;

    return (
        <div className="space-y-6">
            <PageHeader
                title={company?.name || t("customers.detail.title")}
                description={customer.contactName || customer.contactEmail || customer.contactPhone || undefined}
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            iconStart={<ArrowLeft size={14} />}
                            onClick={() => router.push("/admin/customers")}
                        >
                            {t("customers.detail.back")}
                        </Button>
                        <Button size="sm" iconStart={<Pencil size={14} />} onClick={() => setIsEditOpen(true)}>
                            {t("common.edit")}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>{t("customers.detail.info")}</CardTitle>
                            <CustomerStatusBadge status={customer.status} />
                        </div>
                        <dl className="mt-4 space-y-2 text-sm">
                            <InfoRow label={t("customers.detail.company")} value={company?.name || "—"} />
                            <InfoRow label={t("convert.fields.vatNumber")} value={company?.vatNumber || "—"} />
                            <InfoRow label={t("convert.fields.city")} value={company?.city || "—"} />
                            <InfoRow label={t("convert.fields.address")} value={company?.address || "—"} />
                            <InfoRow label={t("customers.detail.contactName")} value={customer.contactName || "—"} />
                            <InfoRow label={t("customers.detail.contactEmail")} value={customer.contactEmail || company?.email || "—"} />
                            <InfoRow label={t("customers.detail.contactPhone")} value={customer.contactPhone || company?.phone || "—"} />
                            <InfoRow label={t("customers.detail.assignedTo")} value={agentName || t("customers.modal.unassigned")} />
                            <InfoRow label={t("customers.detail.created")} value={formatDate(customer.createdAt, locale as Locale)} />
                            <InfoRow
                                label={t("customers.detail.lastContact")}
                                value={customer.lastContactAt ? formatDateTime(customer.lastContactAt, locale as Locale) : "—"}
                            />
                        </dl>
                        {customer.tags?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {customer.tags.map((tag) => (
                                    <Badge key={tag} tone="info">{tag}</Badge>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card>
                        <CardTitle>{t("customers.detail.stats")}</CardTitle>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">{t("customers.detail.totalOrders")}</p>
                                <p className="mt-1 text-xl font-semibold tabular text-gray-900 dark:text-gray-50">{customer.orders.length}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">{t("customers.detail.totalRevenue")}</p>
                                <p className="mt-1 text-xl font-semibold tabular text-gray-900 dark:text-gray-50">
                                    {formatCurrency(computeRevenue(customer), "ILS", locale as Locale)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {customer.sourceLead && (
                        <Card>
                            <CardTitle>{t("customers.detail.sourceLead")}</CardTitle>
                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {customer.sourceLead.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {customer.sourceLead.phone}
                                    </p>
                                    {customer.sourceLead.convertedAt && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {t("leadDetail.convertedCard.convertedAt")} {formatDate(customer.sourceLead.convertedAt, locale as Locale)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <LeadStatusBadge status={customer.sourceLead.status} />
                                    <Link href={`/admin/leads/${customer.sourceLead._id}`}>
                                        <Button size="sm" variant="outline" iconStart={<Inbox size={14} />}>
                                            {t("common.view")}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardTitle>{t("customers.detail.orders")}</CardTitle>
                        <div className="mt-4">
                            {customer.orders.length === 0 ? (
                                <EmptyState icon={<ShoppingBag size={18} />} title={t("customers.detail.ordersEmpty")} />
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH>{t("orders.table.orderId")}</TH>
                                                <TH align="center">{t("orders.table.items")}</TH>
                                                <TH align="end">{t("orders.table.amount")}</TH>
                                                <TH>{t("orders.table.status")}</TH>
                                                <TH>{t("orders.table.created")}</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {customer.orders.map((o) => (
                                                <TR key={o._id}>
                                                    <TD className="font-mono">{shortId(o._id)}</TD>
                                                    <TD align="center" muted className="tabular">{o.items.length}</TD>
                                                    <TD align="end" className="tabular font-medium">
                                                        {formatCurrency(o.totalAmount, "ILS", locale as Locale)}
                                                    </TD>
                                                    <TD><OrderStatusBadge status={o.status} /></TD>
                                                    <TD muted>{formatDate(o.createdAt, locale as Locale)}</TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("customers.detail.invoices")}</CardTitle>
                        <div className="mt-4">
                            {customer.invoices.length === 0 ? (
                                <EmptyState icon={<FileText size={18} />} title={t("customers.detail.invoicesEmpty")} />
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH>{t("invoices.table.invoiceNumber")}</TH>
                                                <TH align="end">{t("invoices.table.amount")}</TH>
                                                <TH>{t("invoices.table.status")}</TH>
                                                <TH>{t("invoices.table.issued")}</TH>
                                                <TH>{t("invoices.table.due")}</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {customer.invoices.map((inv) => (
                                                <TR key={inv._id}>
                                                    <TD className="font-mono font-medium">{inv.invoiceNumber}</TD>
                                                    <TD align="end" className="tabular font-medium">
                                                        {formatCurrency(inv.totalAmount, "ILS", locale as Locale)}
                                                    </TD>
                                                    <TD><InvoiceStatusBadge status={inv.status} /></TD>
                                                    <TD muted>{formatDate(inv.issuedAt, locale as Locale)}</TD>
                                                    <TD muted>{formatDate(inv.dueDate, locale as Locale)}</TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("customers.detail.notes")}</CardTitle>
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={t("customers.detail.notesPlaceholder")}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                                />
                                <Button variant="success" onClick={handleAddNote} loading={savingNote}>
                                    {t("leadDetail.notes.addBtn")}
                                </Button>
                            </div>
                            {customer.notes.length === 0 ? (
                                <EmptyState icon={<MessageSquare size={18} />} title={t("customers.detail.notesEmpty")} />
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pe-2">
                                    {[...customer.notes].reverse().map((note, i) => (
                                        <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{note.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(note.createdAt, locale as Locale)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("customers.detail.timeline")}</CardTitle>
                        <div className="mt-4">
                            {customer.timeline.length === 0 ? (
                                <EmptyState icon={<Activity size={18} />} title={t("customers.detail.timelineEmpty")} />
                            ) : (
                                <ol className="space-y-3 max-h-96 overflow-y-auto pe-2">
                                    {[...customer.timeline].reverse().map((ev: CustomerTimelineEvent, i: number) => (
                                        <li key={i} className="flex items-start gap-3 border-s-2 border-yellow-200 dark:border-yellow-700/50 ps-3 py-1">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {t(`customers.timelineEvents.${ev.type}`) === `customers.timelineEvents.${ev.type}`
                                                        ? ev.type.replace(/_/g, " ")
                                                        : t(`customers.timelineEvents.${ev.type}`)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(ev.at, locale as Locale)}
                                                </p>
                                                {ev.meta && Object.keys(ev.meta).length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-1 break-words">
                                                        {JSON.stringify(ev.meta)}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <CustomerEditModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                customer={customer as Customer}
                agents={agents}
                onSave={handleSave}
            />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="text-xs uppercase tracking-wide text-gray-400 min-w-[7rem]">{label}</dt>
            <dd className="text-sm text-gray-700 dark:text-gray-200 break-words">{value}</dd>
        </div>
    );
}

function computeRevenue(customer: CustomerDetail): number {
    const paid = customer.invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    if (paid > 0) return paid;
    return customer.orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
}

