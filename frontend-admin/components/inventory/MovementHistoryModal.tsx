"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import {
    Badge,
    EmptyState,
    LoadingState,
    Modal,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import { listMovements } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { InventoryMovementRecord, InventoryMovementType, InventoryRow } from "@/types";

const TYPE_TONE: Record<InventoryMovementType, "success" | "danger" | "neutral" | "warning" | "info"> = {
    in: "success",
    out: "danger",
    adjustment: "neutral",
    reserved: "warning",
    released: "info",
};

interface MovementHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    row: InventoryRow | null;
}

export function MovementHistoryModal({ isOpen, onClose, row }: MovementHistoryModalProps) {
    const { t, locale } = useAdminI18n();
    const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const productId = row && typeof row.product === "object" ? row.product._id : undefined;
    const productName = row && typeof row.product === "object" ? row.product.name : "";

    useEffect(() => {
        if (!isOpen || !productId) return;
        let cancelled = false;
        const handle = setTimeout(() => {
            setLoading(true);
            listMovements(productId, 50)
                .then((res) => { if (!cancelled) setMovements(res.data || []); })
                .catch(() => { if (!cancelled) setMovements([]); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, 0);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [isOpen, productId]);

    if (!isOpen || !row) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title={t("inventory.history.title", { name: productName })}>
            {loading ? (
                <LoadingState label={t("inventory.history.loading")} />
            ) : movements.length === 0 ? (
                <EmptyState icon={<History size={18} />} title={t("inventory.history.empty")} />
            ) : (
                <TableContainer>
                    <Table>
                        <THead>
                            <TR>
                                <TH>{t("inventory.history.date")}</TH>
                                <TH>{t("inventory.history.type")}</TH>
                                <TH align="end">{t("inventory.history.quantity")}</TH>
                                <TH>{t("inventory.history.reason")}</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {movements.map((m) => (
                                <TR key={m._id}>
                                    <TD muted>{formatDateTime(m.createdAt, locale as Locale)}</TD>
                                    <TD>
                                        <Badge tone={TYPE_TONE[m.type]}>{t(`inventory.types.${m.type}`)}</Badge>
                                    </TD>
                                    <TD align="end" className="tabular font-medium">{m.quantity}</TD>
                                    <TD muted className="max-w-xs">
                                        <span className="block truncate">{m.reason || "—"}</span>
                                    </TD>
                                </TR>
                            ))}
                        </TBody>
                    </Table>
                </TableContainer>
            )}
        </Modal>
    );
}
