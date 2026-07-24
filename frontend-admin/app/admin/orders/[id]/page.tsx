"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Pencil, FileText, Building2, Activity, Wallet } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
    Button,
    Card,
    CardTitle,
    EmptyState,
    LoadingState,
    PageHeader,
    Select,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { InvoiceStatusBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/dashboard/StatusBadges";
import { OrderModal } from "@/components/orders/OrderModal";
import { ShipmentCard } from "@/components/shipments/ShipmentCard";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDateTime, shortId } from "@/lib/format";
import { getOrder, updateOrder, type OrderUpsertPayload } from "@/lib/ordersApi";
import { listCustomers } from "@/lib/customersApi";
import { listProducts } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { Customer, Invoice, OrderDetail, OrderStatus, OrderTimelineEvent, Product } from "@/types";

const STATUSES: OrderStatus[] = ["pending", "approved", "shipped", "completed", "cancelled"];

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();
    const orderId = params?.id as string;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const fetchOrder = useCallback(async () => {
        if (!orderId) return;
        try {
            const data = await getOrder(orderId);
            setOrder(data);
        } catch (err) {
            console.error(err);
            toast.error(t("orders.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [orderId, t]);

    useEffect(() => {
        if (user) fetchOrder();
    }, [user, fetchOrder]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [c, p] = await Promise.all([
                    listCustomers({ limit: 200 }),
                    listProducts({ limit: 200, isActive: true }),
                ]);
                if (cancelled) return;
                setCustomers(c.data || []);
                setProducts(p.data || []);
            } catch {
                // non-fatal
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleStatusChange = async (status: OrderStatus) => {
        if (!order || status === order.status) return;
        setSavingStatus(true);
        try {
            await updateOrder(order._id, { status });
            toast.success(t("orders.toasts.statusUpdated"));
            await fetchOrder();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("orders.toasts.statusFailed"));
        } finally {
            setSavingStatus(false);
        }
    };

    const handleEdit = async (payload: OrderUpsertPayload) => {
        if (!order) return;
        try {
            await updateOrder(order._id, payload);
            toast.success(t("orders.toasts.updated"));
            await fetchOrder();
        } catch (err) {
            throw err;
        }
    };

    const statusLabel = (status: string) => {
        const key = `orderStatus.${status}`;
        const translated = t(key);
        return translated === key ? status.replace(/_/g, " ") : translated;
    };

    // Timeline meta stays raw in the DB for auditing; here it is summarized into
    // a translated sentence — never rendered as JSON.
    const describeTimelineMeta = (ev: OrderTimelineEvent): { text: string; warn: boolean } | null => {
        const meta = (ev.meta ?? {}) as Record<string, unknown>;
        switch (ev.type) {
            case "status_changed": {
                if (typeof meta.from !== "string" || typeof meta.to !== "string") return null;
                let text = t("orders.timelineMeta.statusTransition", {
                    from: statusLabel(meta.from),
                    to: statusLabel(meta.to),
                });
                if (meta.via === "shipment_delivered") {
                    text += ` · ${t("orders.timelineMeta.viaShipmentDelivered")}`;
                }
                return { text, warn: false };
            }
            case "admin_order_notification": {
                const sent = meta.result === "sent";
                return {
                    text: t(sent ? "orders.timelineMeta.adminNotifSent" : "orders.timelineMeta.adminNotifFailed"),
                    warn: !sent,
                };
            }
            case "customer_order_notification": {
                const email = meta.email === "sent";
                const sms = meta.sms === "sent";
                if (email && sms) return { text: t("orders.timelineMeta.customerNotifBoth"), warn: false };
                if (email) return { text: t("orders.timelineMeta.customerNotifEmailOnly"), warn: true };
                if (sms) return { text: t("orders.timelineMeta.customerNotifSmsOnly"), warn: true };
                return { text: t("orders.timelineMeta.customerNotifFailed"), warn: true };
            }
            default:
                return null;
        }
    };

    if (loading) return <LoadingState label={t("orders.detail.loading")} />;

    if (!order) {
        return (
            <EmptyState
                icon={<FileText size={18} />}
                title={t("orders.detail.notFound")}
                action={
                    <Button variant="outline" onClick={() => router.push("/admin/orders")} iconStart={<ArrowLeft size={14} />}>
                        {t("common.back")}
                    </Button>
                }
            />
        );
    }

    const company = typeof order.company === "object" ? order.company : null;
    const editable = order.status === "pending";

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${t("orders.detail.title")} ${shortId(order._id)}`}
                description={company?.name}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />} onClick={() => router.push("/admin/orders")}>
                            {t("orders.detail.back")}
                        </Button>
                        {editable && (
                            <Button size="sm" iconStart={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
                                {t("common.edit")}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>{t("orders.detail.items")}</CardTitle>
                            <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="mt-4">
                            <TableContainer>
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH>{t("orders.detail.product")}</TH>
                                            <TH align="center">{t("orders.detail.qty")}</TH>
                                            <TH align="end">{t("orders.detail.unitPrice")}</TH>
                                            <TH align="center">{t("orders.detail.tax")}</TH>
                                            <TH align="end">{t("orders.detail.lineTotal")}</TH>
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {order.items.map((it, i) => {
                                            const qty = it.quantity || 0;
                                            const price = it.price || 0;
                                            const sub = qty * price;
                                            const tax = sub * ((it.taxRate || 0) / 100);
                                            return (
                                                <TR key={i}>
                                                    <TD>{it.productName || it.productType || "—"}</TD>
                                                    <TD align="center" muted className="tabular">{qty}</TD>
                                                    <TD align="end" muted className="tabular">{formatCurrency(price, "ILS", locale as Locale)}</TD>
                                                    <TD align="center" muted className="tabular">{it.taxRate ? `${it.taxRate}%` : "—"}</TD>
                                                    <TD align="end" className="tabular font-medium">{formatCurrency(sub + tax, "ILS", locale as Locale)}</TD>
                                                </TR>
                                            );
                                        })}
                                    </TBody>
                                </Table>
                            </TableContainer>
                            <dl className="mt-3 ms-auto w-full max-w-xs space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">{t("orders.detail.subtotal")}</dt>
                                    <dd className="tabular">{formatCurrency(order.subtotal ?? order.totalAmount, "ILS", locale as Locale)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">{t("orders.detail.taxTotal")}</dt>
                                    <dd className="tabular">{formatCurrency(order.taxTotal ?? 0, "ILS", locale as Locale)}</dd>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 font-semibold">
                                    <dt>{t("orders.detail.total")}</dt>
                                    <dd className="tabular">{formatCurrency(order.totalAmount, "ILS", locale as Locale)}</dd>
                                </div>
                            </dl>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("orders.detail.timeline")}</CardTitle>
                        <div className="mt-4">
                            {order.timeline && order.timeline.length > 0 ? (
                                <ol className="space-y-3">
                                    {[...order.timeline].reverse().map((ev, i) => {
                                        const detail = describeTimelineMeta(ev);
                                        return (
                                            <li key={i} className="flex items-start gap-3 border-s-2 border-yellow-200 dark:border-yellow-700/50 ps-3 py-1">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        {t(`orders.timelineEvents.${ev.type}`) === `orders.timelineEvents.${ev.type}`
                                                            ? ev.type.replace(/_/g, " ")
                                                            : t(`orders.timelineEvents.${ev.type}`)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(ev.at, locale as Locale)}</p>
                                                    {detail && (
                                                        <p className={`text-xs mt-0.5 break-words ${detail.warn ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                            {detail.text}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : (
                                <EmptyState icon={<Activity size={18} />} title={t("orders.detail.timelineEmpty")} />
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <CardTitle>{t("orders.detail.status")}</CardTitle>
                        <div className="mt-3">
                            <Select
                                value={order.status}
                                disabled={savingStatus}
                                onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>{t(`orderStatus.${s}`)}</option>
                                ))}
                            </Select>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("orders.detail.statusHint")}</p>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("orders.detail.customer")}</CardTitle>
                        <div className="mt-3 text-sm space-y-1.5">
                            <p className="font-medium text-gray-900 dark:text-gray-50">{company?.name || "—"}</p>
                            {company?.vatNumber && <p className="text-xs font-mono text-gray-500">{company.vatNumber}</p>}
                            {company?.email && <p className="text-xs text-gray-500">{company.email}</p>}
                            {company?.phone && <p className="text-xs text-gray-500">{company.phone}</p>}
                            {order.customer && (
                                <Link href={`/admin/customers/${order.customer._id}`} className="mt-2 inline-block">
                                    <Button size="sm" variant="outline" iconStart={<Building2 size={14} />}>
                                        {t("orders.detail.openCustomer")}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("orders.detail.invoices")}</CardTitle>
                        <div className="mt-3">
                            {order.invoices.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("orders.detail.invoicesEmpty")}</p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {order.invoices.map((inv) => (
                                        <li key={inv._id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
                                            <div className="flex items-center justify-between gap-2 text-sm">
                                                <span className="font-mono text-gray-700 dark:text-gray-200">{inv.invoiceNumber}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="tabular">{formatCurrency(inv.totalAmount, "ILS", locale as Locale)}</span>
                                                    <InvoiceStatusBadge status={inv.status} />
                                                </div>
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {inv.paymentStatus && <PaymentStatusBadge status={inv.paymentStatus} />}
                                                    {typeof inv.amountPaid === "number" && (
                                                        <span className="tabular">
                                                            {t("orders.detail.paid")}: {formatCurrency(inv.amountPaid, "ILS", locale as Locale)}
                                                        </span>
                                                    )}
                                                </div>
                                                {inv.status !== "cancelled" && inv.paymentStatus !== "paid" && (
                                                    <Button size="sm" variant="ghost" iconStart={<Wallet size={13} />} onClick={() => setPayInvoice(inv)}>
                                                        {t("orders.detail.recordPayment")}
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </Card>

                    <ShipmentCard orderId={order._id} />

                    {order.notes && (
                        <Card>
                            <CardTitle>{t("orders.detail.notes")}</CardTitle>
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{order.notes}</p>
                        </Card>
                    )}
                </div>
            </div>

            <OrderModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                order={order}
                customers={customers}
                products={products}
                onSubmit={handleEdit}
            />

            <PaymentModal
                isOpen={!!payInvoice}
                onClose={() => setPayInvoice(null)}
                fixedInvoice={payInvoice}
                onPosted={fetchOrder}
            />
        </div>
    );
}
