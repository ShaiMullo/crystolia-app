"use client";

import { ShoppingBag } from "lucide-react";
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
import { formatCurrency, formatDate, shortId } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Order, OrderStatus } from "@/types";

interface OrdersTabProps {
    orders: Order[];
    loading: boolean;
    statusFilter: OrderStatus | "";
    onStatusFilterChange: (value: OrderStatus | "") => void;
    onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
    savingOrderIds: Set<string>;
    onView: (order: Order) => void;
}

const ORDER_STATUSES: OrderStatus[] = ["pending", "approved", "shipped", "completed", "cancelled"];

const getCompanyName = (order: Order): string => {
    if (!order.company) return "—";
    if (typeof order.company === "object") return order.company.name;
    return order.company;
};

export function OrdersTab({
    orders,
    loading,
    statusFilter,
    onStatusFilterChange,
    onStatusChange,
    savingOrderIds,
    onView,
}: OrdersTabProps) {
    const { t, locale } = useAdminI18n();
    const filtered = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders;

    return (
        <div className="space-y-4">
            <div>
                <Select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as OrderStatus | "")}
                    className="sm:w-48"
                >
                    <option value="">{t("leads.filters.allStatuses")}</option>
                    {ORDER_STATUSES.map((s) => (
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
                        ) : filtered.length === 0 ? (
                            <TR>
                                <TD colSpan={7}>
                                    <EmptyState icon={<ShoppingBag size={18} />} title={t("orders.empty")} />
                                </TD>
                            </TR>
                        ) : (
                            filtered.map((order) => (
                                <TR key={order._id}>
                                    <TD className="font-mono">{shortId(order._id)}</TD>
                                    <TD>{getCompanyName(order)}</TD>
                                    <TD align="center" muted className="tabular">
                                        {order.items.length} {order.items.length !== 1 ? t("orders.itemsSuffix") : t("orders.itemSuffix")}
                                    </TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(order.totalAmount, "ILS", locale as Locale)}
                                    </TD>
                                    <TD>
                                        <Select
                                            pill
                                            value={order.status}
                                            disabled={savingOrderIds.has(order._id)}
                                            onChange={(e) => onStatusChange(order._id, e.target.value as OrderStatus)}
                                            className="!h-6 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                        >
                                            {ORDER_STATUSES.map((s) => (
                                                <option key={s} value={s}>{t(`orderStatus.${s}`)}</option>
                                            ))}
                                        </Select>
                                    </TD>
                                    <TD muted>{formatDate(order.createdAt, locale as Locale)}</TD>
                                    <TD align="end">
                                        <Button size="sm" variant="ghost" onClick={() => onView(order)}>
                                            {t("common.view")}
                                        </Button>
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
