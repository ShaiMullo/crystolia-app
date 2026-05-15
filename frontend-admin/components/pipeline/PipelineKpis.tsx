"use client";

import { TrendingUp, TrendingDown, Trophy, AlertTriangle, Hourglass, DollarSign, Users } from "lucide-react";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { PipelineAnalytics } from "@/types";
import { cn } from "@/lib/cn";

interface PipelineKpisProps {
    analytics: PipelineAnalytics | null;
}

function trendLabel(v: number, t: (k: string, vars?: Record<string, string | number>) => string): string {
    if (!v) return t("pipeline.kpi.flat");
    const pct = Math.round(v * 100);
    if (pct > 0) return t("pipeline.kpi.trendUp", { pct });
    return t("pipeline.kpi.trendDown", { pct: Math.abs(pct) });
}

function percent(v: number): string {
    return `${Math.round(v * 100)}%`;
}

export function PipelineKpis({ analytics }: PipelineKpisProps) {
    const { t, locale } = useAdminI18n();
    if (!analytics) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} padded><div className="h-16 skeleton" /></Card>
                ))}
            </div>
        );
    }

    const trend = analytics.rates.winRateTrend;
    const trendUp = trend >= 0;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    label={t("pipeline.kpi.winRate")}
                    value={percent(analytics.rates.winRate)}
                    accent="success"
                    icon={<Trophy size={18} />}
                    trend={
                        <span className={cn("inline-flex items-center gap-0.5", trendUp ? "text-emerald-600" : "text-red-600")}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trendLabel(trend, t)}
                        </span>
                    }
                    hint={t("pipeline.kpi.winRateHint", { won: analytics.totals.wonThisMonth, lost: analytics.totals.lostThisMonth })}
                />
                <StatCard
                    label={t("pipeline.kpi.conversion")}
                    value={percent(analytics.rates.conversionRate)}
                    accent="brand"
                    icon={<TrendingUp size={18} />}
                    hint={t("pipeline.kpi.conversionHint", { count: analytics.totals.convertedTotal })}
                />
                <StatCard
                    label={t("pipeline.kpi.pipelineValue")}
                    value={formatCurrency(analytics.totals.pipelineRevenue, "ILS", locale as Locale)}
                    icon={<DollarSign size={18} />}
                    hint={t("pipeline.kpi.outstandingHint", { amount: formatCurrency(analytics.totals.outstandingInvoices, "ILS", locale as Locale) })}
                />
                <StatCard
                    label={t("pipeline.kpi.avgResponse")}
                    value={analytics.avgResponseMinutes === null ? "—" : t("pipeline.kpi.minutes", { count: analytics.avgResponseMinutes })}
                    accent="default"
                    icon={<Hourglass size={18} />}
                    hint={t("pipeline.kpi.avgResponseHint")}
                />
                <StatCard
                    label={t("pipeline.kpi.overdueTasks")}
                    value={formatNumber(analytics.totals.overdueTasks, locale as Locale)}
                    accent={analytics.totals.overdueTasks > 0 ? "danger" : "default"}
                    icon={<AlertTriangle size={18} />}
                    hint={t("pipeline.kpi.overdueHint")}
                />
            </div>

            {analytics.topAgents.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <CardTitle>{t("pipeline.kpi.topAgents")}</CardTitle>
                        <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                            <Users size={12} /> {t("pipeline.kpi.topAgentsHint")}
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {analytics.topAgents.map((a, i) => {
                            const max = analytics.topAgents[0].wins || 1;
                            const ratio = (a.wins / max) * 100;
                            return (
                                <li key={a.id} className="flex items-center gap-3 text-sm">
                                    <span className="w-5 text-xs font-medium text-gray-400">{i + 1}.</span>
                                    <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">{a.label}</span>
                                    <span className="hidden sm:block h-1.5 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                        <span className="block h-full bg-yellow-500" style={{ width: `${ratio}%` }} />
                                    </span>
                                    <span className="w-10 text-end tabular font-medium text-gray-700 dark:text-gray-200">{a.wins}</span>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
        </div>
    );
}
