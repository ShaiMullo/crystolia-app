"use client";

import { Button, Modal } from "@/components/ui";
import { OrderStatusBadge } from "./StatusBadges";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, shortId } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Order } from "@/types";

const getCompanyName = (order: Order): string => {
    if (!order.company) return "—";
    if (typeof order.company === "object") return order.company.name;
    return order.company;
};

export function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
    const { t, locale } = useAdminI18n();
    if (!order) return null;

    return (
        <Modal
            isOpen={!!order}
            onClose={onClose}
            size="lg"
            title={`${t("orders.detail.titlePrefix")} ${shortId(order._id)}`}
            footer={
                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        {t("common.close")}
                    </Button>
                </div>
            }
        >
            <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">{t("orders.detail.company")}</dt>
                        <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{getCompanyName(order)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">{t("orders.detail.date")}</dt>
                        <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{formatDate(order.createdAt, locale as Locale)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">{t("orders.detail.status")}</dt>
                        <dd className="mt-1"><OrderStatusBadge status={order.status} /></dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">{t("orders.detail.total")}</dt>
                        <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100 tabular">
                            {formatCurrency(order.totalAmount, "ILS", locale as Locale)}
                        </dd>
                    </div>
                </dl>

                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t("orders.detail.items")}</h4>
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th className="px-3 py-2 text-start font-medium text-gray-500">{t("orders.detail.product")}</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-500">{t("orders.detail.qty")}</th>
                                    <th className="px-3 py-2 text-end font-medium text-gray-500">{t("orders.detail.unitPrice")}</th>
                                    <th className="px-3 py-2 text-end font-medium text-gray-500">{t("orders.detail.subtotal")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.productName || item.productType || "—"}</td>
                                        <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300 tabular">{item.quantity}</td>
                                        <td className="px-3 py-2 text-end text-gray-600 dark:text-gray-300 tabular">
                                            {item.price != null ? formatCurrency(item.price, "ILS", locale as Locale) : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-end font-medium text-gray-900 dark:text-gray-100 tabular">
                                            {item.price != null ? formatCurrency(item.price * item.quantity, "ILS", locale as Locale) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-200 dark:border-gray-700">
                                    <td colSpan={3} className="px-3 pt-2 text-end text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t("orders.detail.total")}
                                    </td>
                                    <td className="px-3 pt-2 text-end font-semibold text-gray-900 dark:text-gray-50 tabular">
                                        {formatCurrency(order.totalAmount, "ILS", locale as Locale)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {order.notes && (
                    <div>
                        <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-1">{t("orders.detail.notes")}</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
                            {order.notes}
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
