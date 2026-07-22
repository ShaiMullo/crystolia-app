"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { Badge, Card, CardTitle, EmptyState, SkeletonLine } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n";
import {
    listRegistrations,
    registrationCompanyOf,
    type RegistrationRequest,
} from "@/lib/registrationsApi";

/**
 * Dashboard card: pending registration-requests count, the 5 latest requests
 * and a link to the full screen.
 */
export function RegistrationsWidget() {
    const { t, locale } = useAdminI18n();
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [recent, setRecent] = useState<RegistrationRequest[]>([]);

    const refresh = useCallback(async () => {
        try {
            const [pending, latest] = await Promise.all([
                listRegistrations({ status: "pending", page: 1, limit: 1 }),
                listRegistrations({ page: 1, limit: 5 }),
            ]);
            setPendingCount(pending.pagination?.total ?? 0);
            setRecent(latest.data);
        } catch {
            // Silent — the dashboard widget never blocks the page on failure.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t0 = setTimeout(() => { void refresh(); }, 0);
        return () => clearTimeout(t0);
    }, [refresh]);

    return (
        <Card>
            <div className="flex items-start justify-between gap-3">
                <CardTitle>{t("registrations.widget.title")}</CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:ring-yellow-900">
                    <UserRoundPlus size={13} aria-hidden="true" />
                    {pendingCount} {t("registrations.widget.pendingLabel")}
                </span>
            </div>

            <div className="mt-4 space-y-2">
                {loading ? (
                    <>
                        <SkeletonLine />
                        <SkeletonLine />
                        <SkeletonLine />
                    </>
                ) : recent.length === 0 ? (
                    <EmptyState title={t("registrations.widget.empty")} />
                ) : (
                    recent.map((r) => {
                        const status = r.registrationStatus ?? "pending";
                        return (
                            <Link
                                key={r._id}
                                href={`/admin/registrations/${r._id}`}
                                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {r.name || r.email}
                                    </span>
                                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                        {registrationCompanyOf(r)?.name || "—"}
                                        {r.createdAt ? ` · ${formatDateTime(r.createdAt, locale as Locale)}` : ""}
                                    </span>
                                </span>
                                <Badge tone={status === "pending" ? "warning" : status === "approved" ? "success" : "danger"}>
                                    {t(`registrations.status.${status}`)}
                                </Badge>
                            </Link>
                        );
                    })
                )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Link
                    href="/admin/registrations"
                    className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950/40"
                >
                    {t("registrations.widget.viewAll")}
                </Link>
            </div>
        </Card>
    );
}

export default RegistrationsWidget;
