"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Plus, RefreshCw, ShoppingBag } from "lucide-react";
import {
    Button,
    EmptyState,
    Pagination,
    PageHeader,
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
import { OrderStatusBadge } from "@/components/dashboard/StatusBadges";
import { OrderModal } from "@/components/orders/OrderModal";
import { ExportButton } from "@/components/system/ExportButton";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, shortId } from "@/lib/format";
import { createOrder, listOrders, type OrderUpsertPayload } from "@/lib/ordersApi";
import { listCustomers } from "@/lib/customersApi";
import { listProducts } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { Customer, Order, OrderStatus, Product } from "@/types";

const STATUSES: OrderStatus[] = ["pending", "approved", "rejected", "shipped", "completed", "cancelled"];

function companyName(o: Order): string {
    if (o.company && typeof o.company === "object") return o.company.name;
    return "—";
}

export default function OrdersPage() {
    const { t, locale } = useAdminI18n();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listOrders({ page, limit: 20, status: statusFilter || undefined });
            setOrders(res.data || []);
            setTotalPages(res.pagination?.pages || 1);
        } catch (err) {
            console.error(err);
            toast.error(t("orders.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, t]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    // Load selector data once.
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
                // non-fatal — modal selectors just stay empty
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleCreate = async (payload: OrderUpsertPayload) => {
        try {
            await createOrder(payload);
            toast.success(t("orders.toasts.created"));
            await fetchOrders();
        } catch (err) {
            throw err;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("orders.pageTitle")}
                description={t("orders.pageSubtitle")}
                actions={
                    <>
                        <ExportButton dataset="orders" />
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchOrders}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                            {t("orders.new")}
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
                    className="sm:w-48"
                >
                    <option value="">{t("orders.filters.allStatuses")}</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`orderStatus.${s}`)}</option>
                    ))}
                </Select>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("orders.table.orderId")}</TH>
                            <TH>{t("orders.table.company")}</TH>
                            <TH align="center">{t("orders.table.items")}</TH>
                            <TH align="end">{t("orders.table.amount")}</TH>
                            <TH>{t("orders.table.status")}</TH>
                            <TH>{t("orders.table.created")}</TH>
                            <TH align="end">{t("orders.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={7} />
                        ) : orders.length === 0 ? (
                            <TR>
                                <TD colSpan={7}>
                                    <EmptyState
                                        icon={<ShoppingBag size={18} />}
                                        title={t("orders.empty")}
                                        description={t("orders.emptyHint")}
                                        action={
                                            <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                                                {t("orders.new")}
                                            </Button>
                                        }
                                    />
                                </TD>
                            </TR>
                        ) : (
                            orders.map((o) => (
                                <TR key={o._id}>
                                    <TD className="font-mono">{shortId(o._id)}</TD>
                                    <TD>{companyName(o)}</TD>
                                    <TD align="center" muted className="tabular">{o.items.length}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(o.totalAmount, "ILS", locale as Locale)}
                                    </TD>
                                    <TD><OrderStatusBadge status={o.status} /></TD>
                                    <TD muted>{formatDate(o.createdAt, locale as Locale)}</TD>
                                    <TD align="end">
                                        <Link href={`/admin/orders/${o._id}`}>
                                            <Button size="sm" variant="outline">{t("common.view")}</Button>
                                        </Link>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            <OrderModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                order={null}
                customers={customers}
                products={products}
                onSubmit={handleCreate}
            />
        </div>
    );
}
