"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, ArrowRight } from "lucide-react";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { listInventory } from "@/lib/inventoryApi";
import type { InventoryRow } from "@/types";

export function LowStockWidget() {
    const { t } = useAdminI18n();
    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await listInventory(true);
                if (!cancelled) setRows(data || []);
            } catch {
                if (!cancelled) setRows([]);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!loaded) return null;

    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
                <CardTitle>{t("dashboard.lowStock.title")}</CardTitle>
                {rows.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={12} /> {rows.length}
                    </span>
                )}
            </div>
            {rows.length === 0 ? (
                <EmptyState
                    icon={<Boxes size={18} />}
                    title={t("dashboard.lowStock.empty")}
                    description={t("dashboard.lowStock.emptyHint")}
                />
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.slice(0, 6).map((row) => {
                        const product = typeof row.product === "object" ? row.product : null;
                        return (
                            <li key={row._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-gray-900 dark:text-gray-50">
                                        {product?.name || "—"}
                                    </p>
                                    {product?.sku && (
                                        <p className="text-xs font-mono text-gray-400">{product.sku}</p>
                                    )}
                                </div>
                                <div className="text-end shrink-0">
                                    <p className="tabular text-amber-700 dark:text-amber-300 font-medium">
                                        {row.availableQuantity}
                                    </p>
                                    <p className="text-xs text-gray-400 tabular">
                                        {t("dashboard.lowStock.min")}: {row.minimumQuantity}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-3 flex justify-end">
                <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:underline">
                    {t("dashboard.lowStock.viewAll")} <ArrowRight size={12} />
                </Link>
            </div>
        </Card>
    );
}
