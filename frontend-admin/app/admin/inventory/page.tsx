"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, Boxes, History, PackagePlus, Pencil, RefreshCw, ScanLine } from "lucide-react";
import {
    Badge,
    Button,
    EmptyState,
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
import { AddStockModal } from "@/components/inventory/AddStockModal";
import { InventoryMovementModal } from "@/components/inventory/InventoryMovementModal";
import { MovementHistoryModal } from "@/components/inventory/MovementHistoryModal";
import { ExportButton } from "@/components/system/ExportButton";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import {
    createMovement,
    listInventory,
    listProducts,
    runReconciliation,
    type MovementPayload,
} from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { InventoryRow, Product } from "@/types";
import { cn } from "@/lib/cn";

// Small horizontal bar: available (emerald) + reserved (amber) within on-hand.
function StockBar({ row }: { row: InventoryRow }) {
    const total = Math.max(row.quantity, 1);
    const reservedPct = Math.min(100, (row.reservedQuantity / total) * 100);
    const availablePct = Math.min(100, (row.availableQuantity / total) * 100);
    return (
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 flex">
            <span className="block h-full bg-emerald-500" style={{ width: `${availablePct}%` }} />
            <span className="block h-full bg-amber-400" style={{ width: `${reservedPct}%` }} />
        </div>
    );
}

export default function InventoryPage() {
    const { t, locale } = useAdminI18n();
    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "low">("all");
    const [adjustingRow, setAdjustingRow] = useState<InventoryRow | null>(null);
    const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [addStockOpen, setAddStockOpen] = useState(false);
    const [reconciling, setReconciling] = useState(false);

    // Always fetch the FULL list — the low-stock filter is applied client-side
    // below so the missing-products notice keeps seeing every existing row.
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listInventory(false);
            setRows(data || []);
        } catch (err) {
            console.error(err);
            toast.error(t("inventory.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // Active products feed the add-stock selector and the "no inventory row
    // yet" notice. A failure here only degrades that extra — the table still
    // renders — so it does not share the table's error toast.
    const fetchProducts = useCallback(async () => {
        try {
            const res = await listProducts({ isActive: true, limit: 200 });
            setProducts(res.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const lowStockCount = useMemo(() => rows.filter((r) => r.isLowStock).length, [rows]);
    const visibleRows = useMemo(
        () => (filter === "low" ? rows.filter((r) => r.isLowStock) : rows),
        [rows, filter],
    );

    // Stock-tracked active products with no Inventory row at the default
    // "main" location — the exact gap the add-stock action exists to close.
    // Purely derived for the notice; nothing synthetic enters the table.
    const missingProductIds = useMemo(() => {
        const covered = new Set(
            rows
                .filter((r) => r.location === "main")
                .map((r) => (typeof r.product === "object" ? r.product._id : r.product)),
        );
        return new Set(
            products
                .filter((p) => p.stockTrackingEnabled && !covered.has(p._id))
                .map((p) => p._id),
        );
    }, [rows, products]);

    const openAdjust = (row: InventoryRow) => {
        setAdjustingRow(row);
        setModalOpen(true);
    };

    const openHistory = (row: InventoryRow) => {
        setHistoryRow(row);
        setHistoryOpen(true);
    };

    const handleMovement = async (payload: MovementPayload) => {
        try {
            await createMovement(payload);
            toast.success(t("inventory.toasts.created"));
            await fetchList();
        } catch (err) {
            throw err;
        }
    };

    // Opening-stock receipts refresh the missing-products notice too — the
    // backend created the row, so it must move from the notice into the table.
    const handleAddStock = async (payload: MovementPayload) => {
        await createMovement(payload);
        toast.success(t("inventory.addStock.success"));
        await Promise.all([fetchList(), fetchProducts()]);
    };

    const handleReconcile = async () => {
        setReconciling(true);
        try {
            const result = await runReconciliation(true, true);
            if (result.discrepancies.length === 0) {
                toast.success(t("inventory.reconciliation.clean"));
            } else {
                toast.success(t("inventory.reconciliation.fixed", { count: result.discrepancies.length }));
            }
            await fetchList();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("inventory.reconciliation.failed"));
        } finally {
            setReconciling(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("inventory.pageTitle")}
                description={t("inventory.pageSubtitle")}
                actions={
                    <>
                        <ExportButton dataset="inventory" />
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchList}>
                            {t("common.refresh")}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            iconStart={<ScanLine size={14} />}
                            loading={reconciling}
                            onClick={handleReconcile}
                        >
                            {t("inventory.reconciliation.run")}
                        </Button>
                        <Button size="sm" iconStart={<PackagePlus size={14} />} onClick={() => setAddStockOpen(true)}>
                            {t("inventory.addStock.button")}
                        </Button>
                    </>
                }
            />

            {missingProductIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/80 p-3 dark:border-blue-700/30 dark:bg-blue-900/10">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        {t("inventory.addStock.missingNotice", { count: missingProductIds.size })}
                    </p>
                    <Button size="sm" variant="outline" iconStart={<PackagePlus size={14} />} onClick={() => setAddStockOpen(true)}>
                        {t("inventory.addStock.button")}
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "low")} className="sm:w-48">
                    <option value="all">{t("inventory.filters.all")}</option>
                    <option value="low">{t("inventory.filters.low")}</option>
                </Select>
                {lowStockCount > 0 && (
                    <Badge tone="warning">
                        <AlertTriangle size={12} className="me-1" /> {t("inventory.lowStockCount", { count: lowStockCount })}
                    </Badge>
                )}
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("inventory.table.product")}</TH>
                            <TH>{t("inventory.table.location")}</TH>
                            <TH align="end">{t("inventory.table.onHand")}</TH>
                            <TH align="end">{t("inventory.table.reserved")}</TH>
                            <TH align="end">{t("inventory.table.available")}</TH>
                            <TH>{t("inventory.table.level")}</TH>
                            <TH align="end">{t("inventory.table.minimum")}</TH>
                            <TH>{t("inventory.table.lastMovement")}</TH>
                            <TH align="end">{t("inventory.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={9} />
                        ) : visibleRows.length === 0 ? (
                            <TR>
                                <TD colSpan={9}>
                                    <EmptyState
                                        icon={<Boxes size={18} />}
                                        title={t("inventory.empty")}
                                        description={t("inventory.emptyHint")}
                                        action={
                                            <Button size="sm" iconStart={<PackagePlus size={14} />} onClick={() => setAddStockOpen(true)}>
                                                {t("inventory.addStock.button")}
                                            </Button>
                                        }
                                    />
                                </TD>
                            </TR>
                        ) : (
                            visibleRows.map((row) => {
                                const product = typeof row.product === "object" ? row.product : null;
                                return (
                                    <TR key={row._id} className={row.isLowStock ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}>
                                        <TD>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-50">{product?.name || "—"}</span>
                                                {row.isLowStock && (
                                                    <Badge tone="warning" size="sm">{t("inventory.lowChip")}</Badge>
                                                )}
                                            </div>
                                            {product?.sku && <div className="text-xs text-gray-400 font-mono">{product.sku}</div>}
                                        </TD>
                                        <TD muted>{row.location}</TD>
                                        <TD align="end" className="tabular font-medium">{row.quantity}</TD>
                                        <TD align="end" className="tabular text-amber-700 dark:text-amber-300">{row.reservedQuantity}</TD>
                                        <TD align="end" className={cn("tabular font-semibold", row.isLowStock && "text-amber-700 dark:text-amber-300")}>
                                            {row.availableQuantity}
                                        </TD>
                                        <TD><StockBar row={row} /></TD>
                                        <TD align="end" muted className="tabular">{row.minimumQuantity}</TD>
                                        <TD muted>{row.lastMovementAt ? formatDateTime(row.lastMovementAt, locale as Locale) : "—"}</TD>
                                        <TD align="end">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="ghost" iconStart={<History size={14} />} onClick={() => openHistory(row)}>
                                                    {t("inventory.history.short")}
                                                </Button>
                                                <Button size="sm" variant="outline" iconStart={<Pencil size={14} />} onClick={() => openAdjust(row)}>
                                                    {t("inventory.adjust")}
                                                </Button>
                                            </div>
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <AddStockModal
                isOpen={addStockOpen}
                onClose={() => setAddStockOpen(false)}
                products={products}
                missingProductIds={missingProductIds}
                onSubmit={handleAddStock}
            />
            <InventoryMovementModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                row={adjustingRow}
                onSubmit={handleMovement}
            />
            <MovementHistoryModal
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                row={historyRow}
            />
        </div>
    );
}
