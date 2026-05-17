"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Percent, Coins } from "lucide-react";
import { Card, CardTitle } from "@/components/ui";
import { ExportButton } from "@/components/system/ExportButton";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency } from "@/lib/format";
import { getProfitability } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { ProfitabilitySummary } from "@/types";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
            <div className="mt-0.5 text-gray-400">{icon}</div>
            <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular text-gray-900 dark:text-gray-50">{value}</p>
            </div>
        </div>
    );
}

export function ProfitabilityWidget() {
    const { t, locale } = useAdminI18n();
    const [data, setData] = useState<ProfitabilitySummary | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getProfitability()
            .then((d) => { if (!cancelled) setData(d); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    if (!loaded) return <Card><div className="h-40 skeleton rounded-lg" /></Card>;
    if (!data) return null;

    const loc = locale as Locale;

    return (
        <Card>
            <div className="flex items-center justify-between gap-3">
                <CardTitle>{t("profitability.title")}</CardTitle>
                <ExportButton dataset="profitability" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Stat icon={<Coins size={16} />} label={t("profitability.revenue")} value={formatCurrency(data.totals.revenue, "ILS", loc)} />
                <Stat icon={<Coins size={16} />} label={t("profitability.cogs")} value={formatCurrency(data.totals.cogs, "ILS", loc)} />
                <Stat icon={<TrendingUp size={16} />} label={t("profitability.grossProfit")} value={formatCurrency(data.totals.grossProfit, "ILS", loc)} />
                <Stat icon={<Percent size={16} />} label={t("profitability.margin")} value={`${data.totals.marginPct}%`} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t("profitability.topProducts")}</h4>
                    {data.topProducts.length === 0 ? (
                        <p className="text-sm text-gray-400">{t("profitability.noData")}</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.topProducts.slice(0, 5).map((p) => (
                                <li key={p.productId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                    <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{p.name}</span>
                                    <span className="text-xs text-gray-400 tabular">{p.marginPct}%</span>
                                    <span className="tabular font-medium w-24 text-end">{formatCurrency(p.profit, "ILS", loc)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t("profitability.topCustomers")}</h4>
                    {data.topCustomers.length === 0 ? (
                        <p className="text-sm text-gray-400">{t("profitability.noData")}</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.topCustomers.slice(0, 5).map((c) => (
                                <li key={c.companyId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                    <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">{c.name}</span>
                                    <span className="text-xs text-gray-400 tabular">{c.marginPct}%</span>
                                    <span className="tabular font-medium w-24 text-end">{formatCurrency(c.profit, "ILS", loc)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
}
