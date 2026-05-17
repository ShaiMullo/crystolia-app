"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Wallet, Boxes, FileWarning, ArrowRight } from "lucide-react";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, shortId } from "@/lib/format";
import { getFinanceSummary } from "@/lib/ordersApi";
import type { Locale } from "@/i18n";
import type { FinanceSummary } from "@/types";

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
    return (
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
            <div className="mt-0.5 text-gray-400">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular text-gray-900 dark:text-gray-50">{value}</p>
                {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            </div>
        </div>
    );
}

export function FinanceWidget() {
    const { t, locale } = useAdminI18n();
    const [data, setData] = useState<FinanceSummary | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getFinanceSummary()
            .then((d) => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    if (!loaded) {
        return <Card><div className="h-40 skeleton rounded-lg" /></Card>;
    }
    if (!data) return null;

    const loc = locale as Locale;

    return (
        <Card>
            <div className="flex items-center justify-between gap-3 mb-3">
                <CardTitle>{t("dashboard.finance.title")}</CardTitle>
                <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:underline">
                    {t("dashboard.finance.viewOrders")} <ArrowRight size={12} />
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Metric
                    icon={<TrendingUp size={16} />}
                    label={t("dashboard.finance.monthRevenue")}
                    value={formatCurrency(data.revenue.ordersThisMonth, "ILS", loc)}
                    hint={t("dashboard.finance.ordersCount", { count: data.revenue.ordersThisMonthCount })}
                />
                <Metric
                    icon={<Wallet size={16} />}
                    label={t("dashboard.finance.paidInvoices")}
                    value={formatCurrency(data.revenue.paidInvoices, "ILS", loc)}
                />
                <Metric
                    icon={<Boxes size={16} />}
                    label={t("dashboard.finance.inventoryValue")}
                    value={formatCurrency(data.inventoryValuation.cost, "ILS", loc)}
                    hint={t("dashboard.finance.retailValue", { amount: formatCurrency(data.inventoryValuation.retail, "ILS", loc) })}
                />
                <Metric
                    icon={<FileWarning size={16} />}
                    label={t("dashboard.finance.outstanding")}
                    value={formatCurrency(data.invoices.outstandingTotal, "ILS", loc)}
                    hint={t("dashboard.finance.overdueCount", { count: data.invoices.overdueCount })}
                />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t("dashboard.finance.recentOrders")}</h4>
                    {data.recentOrders.length === 0 ? (
                        <p className="text-sm text-gray-400">{t("dashboard.finance.noOrders")}</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.recentOrders.slice(0, 5).map((o) => (
                                <li key={o._id} className="py-1.5">
                                    <Link href={`/admin/orders/${o._id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                                        <span className="font-mono text-gray-600 dark:text-gray-300">{shortId(o._id)}</span>
                                        <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">
                                            {typeof o.company === "object" ? o.company.name : "—"}
                                        </span>
                                        <span className="tabular font-medium">{formatCurrency(o.totalAmount, "ILS", loc)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t("dashboard.finance.overdueInvoices")}</h4>
                    {data.invoices.overdue.length === 0 ? (
                        <EmptyState title={t("dashboard.finance.noOverdue")} className="!py-4" />
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.invoices.overdue.slice(0, 5).map((inv) => (
                                <li key={inv._id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                    <span className="font-mono text-gray-600 dark:text-gray-300">{inv.invoiceNumber}</span>
                                    <span className="text-xs text-red-600">{inv.dueDate ? formatDate(inv.dueDate, loc) : "—"}</span>
                                    <span className="tabular font-medium">{formatCurrency(inv.totalAmount, "ILS", loc)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
}
