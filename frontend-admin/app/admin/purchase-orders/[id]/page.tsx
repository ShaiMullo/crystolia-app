"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, PackageOpen, PackageCheck, Activity } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
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
import { PurchaseOrderStatusBadge } from "@/components/dashboard/StatusBadges";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
    getPurchaseOrder,
    receivePurchaseOrder,
    updatePurchaseOrder,
} from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { PurchaseOrder } from "@/types";

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();
    const poId = params?.id as string;

    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});

    const fetchPo = useCallback(async () => {
        if (!poId) return;
        try {
            setPo(await getPurchaseOrder(poId));
        } catch (err) {
            console.error(err);
            toast.error(t("purchaseOrders.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [poId, t]);

    useEffect(() => {
        if (user) fetchPo();
    }, [user, fetchPo]);

    const handleStatus = async (status: "ordered" | "cancelled") => {
        if (!po) return;
        setBusy(true);
        try {
            await updatePurchaseOrder(po._id, { status });
            toast.success(t("purchaseOrders.toasts.updated"));
            await fetchPo();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || t("purchaseOrders.toasts.updateFailed"));
        } finally {
            setBusy(false);
        }
    };

    const handleReceive = async () => {
        if (!po) return;
        const receipts = Object.entries(receiveQty)
            .map(([productId, qty]) => ({ productId, quantity: parseFloat(qty) || 0 }))
            .filter((r) => r.quantity > 0);
        if (receipts.length === 0) {
            toast.error(t("purchaseOrders.detail.nothingToReceive"));
            return;
        }
        setBusy(true);
        try {
            await receivePurchaseOrder(po._id, receipts);
            toast.success(t("purchaseOrders.toasts.received"));
            setReceiveQty({});
            await fetchPo();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || t("purchaseOrders.toasts.receiveFailed"));
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <LoadingState label={t("purchaseOrders.detail.loading")} />;

    if (!po) {
        return (
            <EmptyState
                icon={<PackageOpen size={18} />}
                title={t("purchaseOrders.detail.notFound")}
                action={
                    <Button variant="outline" onClick={() => router.push("/admin/purchase-orders")} iconStart={<ArrowLeft size={14} />}>
                        {t("common.back")}
                    </Button>
                }
            />
        );
    }

    const supplierName = typeof po.supplier === "object" && po.supplier ? po.supplier.name : "—";
    const canReceive = po.status === "ordered" || po.status === "partially_received";
    const canOrder = po.status === "draft";
    const canCancel = po.status === "draft" || po.status === "ordered";

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${t("purchaseOrders.detail.title")} ${po.poNumber}`}
                description={supplierName}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />} onClick={() => router.push("/admin/purchase-orders")}>
                            {t("purchaseOrders.detail.back")}
                        </Button>
                        {canOrder && (
                            <Button size="sm" loading={busy} onClick={() => handleStatus("ordered")}>
                                {t("purchaseOrders.detail.markOrdered")}
                            </Button>
                        )}
                        {canCancel && (
                            <Button size="sm" variant="outline" loading={busy} onClick={() => handleStatus("cancelled")}
                                className="text-red-600">
                                {t("purchaseOrders.detail.cancel")}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>{t("purchaseOrders.detail.items")}</CardTitle>
                            <PurchaseOrderStatusBadge status={po.status} />
                        </div>
                        <div className="mt-4">
                            <TableContainer>
                                <Table>
                                    <THead>
                                        <TR>
                                            <TH>{t("purchaseOrders.detail.product")}</TH>
                                            <TH align="center">{t("purchaseOrders.detail.ordered")}</TH>
                                            <TH align="center">{t("purchaseOrders.detail.received")}</TH>
                                            <TH align="center">{t("purchaseOrders.detail.outstanding")}</TH>
                                            <TH align="end">{t("purchaseOrders.detail.unitCost")}</TH>
                                            {canReceive && <TH align="center">{t("purchaseOrders.detail.receiveNow")}</TH>}
                                        </TR>
                                    </THead>
                                    <TBody>
                                        {po.items.map((it) => {
                                            const outstanding = it.quantity - it.receivedQuantity;
                                            return (
                                                <TR key={it.product}>
                                                    <TD className="font-medium">{it.productName}</TD>
                                                    <TD align="center" muted className="tabular">{it.quantity}</TD>
                                                    <TD align="center" muted className="tabular">{it.receivedQuantity}</TD>
                                                    <TD align="center" className="tabular font-medium">{outstanding}</TD>
                                                    <TD align="end" muted className="tabular">{formatCurrency(it.unitCost, "ILS", locale as Locale)}</TD>
                                                    {canReceive && (
                                                        <TD align="center">
                                                            {outstanding > 0 ? (
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max={outstanding}
                                                                    step="1"
                                                                    className="!h-8 w-20 mx-auto"
                                                                    value={receiveQty[it.product] || ""}
                                                                    onChange={(e) => setReceiveQty((p) => ({ ...p, [it.product]: e.target.value }))}
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-emerald-600">{t("purchaseOrders.detail.complete")}</span>
                                                            )}
                                                        </TD>
                                                    )}
                                                </TR>
                                            );
                                        })}
                                    </TBody>
                                </Table>
                            </TableContainer>
                            {canReceive && (
                                <div className="mt-3 flex justify-end">
                                    <Button size="sm" iconStart={<PackageCheck size={14} />} loading={busy} onClick={handleReceive}>
                                        {t("purchaseOrders.detail.receiveStock")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("purchaseOrders.detail.timeline")}</CardTitle>
                        <div className="mt-4">
                            {po.timeline && po.timeline.length > 0 ? (
                                <ol className="space-y-3">
                                    {[...po.timeline].reverse().map((ev, i) => (
                                        <li key={i} className="flex items-start gap-3 border-s-2 border-yellow-200 dark:border-yellow-700/50 ps-3 py-1">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {ev.type.replace(/_/g, " ")}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(ev.at, locale as Locale)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <EmptyState icon={<Activity size={18} />} title={t("purchaseOrders.detail.timelineEmpty")} />
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <CardTitle>{t("purchaseOrders.detail.summary")}</CardTitle>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">{t("purchaseOrders.detail.supplier")}</dt>
                                <dd className="font-medium">{supplierName}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">{t("purchaseOrders.detail.totalCost")}</dt>
                                <dd className="tabular font-semibold">{formatCurrency(po.totalCost, "ILS", locale as Locale)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">{t("purchaseOrders.detail.created")}</dt>
                                <dd>{formatDateTime(po.createdAt, locale as Locale)}</dd>
                            </div>
                            {po.receivedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500 dark:text-gray-400">{t("purchaseOrders.detail.receivedAt")}</dt>
                                    <dd>{formatDateTime(po.receivedAt, locale as Locale)}</dd>
                                </div>
                            )}
                        </dl>
                        {po.notes && (
                            <p className="mt-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5 whitespace-pre-wrap">
                                {po.notes}
                            </p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
