"use client";

import { useMemo } from "react";
import { Users, FileText, ShoppingBag, Inbox, type LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Invoice, Lead, Order, User } from "@/types";

interface KpiGridProps {
    leads: Lead[];
    users: User[];
    orders: Order[];
    invoices: Invoice[];
}

interface Kpi {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    accent?: "default" | "brand" | "success" | "warning" | "danger";
}

export function KpiGrid({ leads, users, orders, invoices }: KpiGridProps) {
    const { t, locale } = useAdminI18n();

    const kpis = useMemo<Kpi[]>(() => {
        const newLeads = leads.filter((l) => l.status === "new").length;
        const convertedLeads = leads.filter((l) => l.status === "converted" || l.convertedToCompanyId).length;
        const activeAgents = users.filter((u) => u.role === "agent" && u.isActive).length;
        const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "approved").length;
        const ordersRevenue = orders
            .filter((o) => o.status !== "cancelled")
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const outstandingInvoices = invoices
            .filter((inv) => inv.status === "issued")
            .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        return [
            {
                label: t("dashboard.kpi.openLeads"),
                value: formatNumber(newLeads, locale as Locale),
                hint: t("dashboard.kpi.openLeadsHint", { total: leads.length }),
                icon: Inbox,
                accent: "brand",
            },
            {
                label: t("dashboard.kpi.converted"),
                value: formatNumber(convertedLeads, locale as Locale),
                hint: t("dashboard.kpi.convertedHint"),
                icon: Users,
                accent: "success",
            },
            {
                label: t("dashboard.kpi.pendingOrders"),
                value: formatNumber(pendingOrders, locale as Locale),
                hint: ordersRevenue
                    ? t("dashboard.kpi.ordersRevenueHint", {
                          amount: formatCurrency(ordersRevenue, "ILS", locale as Locale),
                      })
                    : undefined,
                icon: ShoppingBag,
                accent: "warning",
            },
            {
                label: t("dashboard.kpi.outstandingInvoices"),
                value: formatCurrency(outstandingInvoices, "ILS", locale as Locale),
                hint: t("dashboard.kpi.outstandingHint", { count: invoices.filter((inv) => inv.status === "issued").length }),
                icon: FileText,
                accent: "default",
            },
            {
                label: t("dashboard.kpi.activeAgents"),
                value: formatNumber(activeAgents, locale as Locale),
                icon: Users,
                accent: "default",
                hint: undefined,
            },
        ];
    }, [leads, users, orders, invoices, t, locale]);

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => (
                <StatCard
                    key={k.label}
                    label={k.label}
                    value={k.value}
                    hint={k.hint}
                    accent={k.accent}
                    icon={<k.icon size={18} />}
                />
            ))}
        </div>
    );
}
