"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, Boxes, History, RefreshCw } from "lucide-react";
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
import { InventoryMovementModal } from "@/components/inventory/InventoryMovementModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import { createMovement, listInventory, type MovementPayload } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { InventoryRow } from "@/types";

export default function InventoryPage() {
    const { t, locale } = useAdminI18n();
    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "low">("all");
    const [adjustingRow, setAdjustingRow] = useState<InventoryRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listInventory(filter === "low");
            setRows(data || []);
        } catch (err) {
            console.error(err);
            toast.error(t("inventory.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [filter, t]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const lowStockCount = useMemo(() => rows.filter((r) => r.isLowStock).length, [rows]);

    const openAdjust = (row: InventoryRow) => {
        setAdjustingRow(row);
        setModalOpen(true);
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("inventory.pageTitle")}
                description={t("inventory.pageSubtitle")}
                actions={
                    <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchList}>
                        {t("common.refresh")}
                    </Button>
                }
            />

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
                            <TH align="end">{t("inventory.table.minimum")}</TH>
                            <TH>{t("inventory.table.lastMovement")}</TH>
                            <TH align="end">{t("inventory.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={8} />
                        ) : rows.length === 0 ? (
                            <TR>
                                <TD colSpan={8}>
                                    <EmptyState
                                        icon={<Boxes size={18} />}
                                        title={t("inventory.empty")}
                                        description={t("inventory.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            rows.map((row) => {
                                const product = typeof row.product === "object" ? row.product : null;
                                return (
                                    <TR key={row._id} className={row.isLowStock ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}>
                                        <TD>
                                            <div className="font-medium text-gray-900 dark:text-gray-50">{product?.name || "—"}</div>
                                            {product?.sku && <div className="text-xs text-gray-400 font-mono">{product.sku}</div>}
                                        </TD>
                                        <TD muted>{row.location}</TD>
                                        <TD align="end" className="tabular font-medium">{row.quantity}</TD>
                                        <TD align="end" className="tabular text-amber-700 dark:text-amber-300">{row.reservedQuantity}</TD>
                                        <TD align="end" className="tabular font-semibold">{row.availableQuantity}</TD>
                                        <TD align="end" muted className="tabular">{row.minimumQuantity}</TD>
                                        <TD muted>{row.lastMovementAt ? formatDateTime(row.lastMovementAt, locale as Locale) : "—"}</TD>
                                        <TD align="end">
                                            <Button size="sm" variant="outline" iconStart={<History size={14} />} onClick={() => openAdjust(row)}>
                                                {t("inventory.adjust")}
                                            </Button>
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <InventoryMovementModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                row={adjustingRow}
                onSubmit={handleMovement}
            />
        </div>
    );
}
