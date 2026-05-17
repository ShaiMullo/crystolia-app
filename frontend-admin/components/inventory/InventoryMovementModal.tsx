"use client";

import React, { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { InventoryMovementType, InventoryRow } from "@/types";
import type { MovementPayload } from "@/lib/inventoryApi";

const TYPES: InventoryMovementType[] = ["in", "out", "adjustment", "reserved", "released"];

interface InventoryMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    row: InventoryRow | null;
    onSubmit: (payload: MovementPayload) => Promise<void>;
}

export function InventoryMovementModal({ isOpen, onClose, row, onSubmit }: InventoryMovementModalProps) {
    const { t } = useAdminI18n();
    const [type, setType] = useState<InventoryMovementType>("in");
    const [quantity, setQuantity] = useState("0");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setType("in");
        setQuantity("0");
        setReason("");
        setError(null);
        setSaving(false);
    }, [isOpen]);

    if (!isOpen || !row) return null;

    const productId = typeof row.product === "object" ? row.product._id : row.product;
    const productName = typeof row.product === "object" ? row.product.name : "—";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = parseFloat(quantity);
        if (isNaN(q) || (type !== "adjustment" && q <= 0) || (type === "adjustment" && q < 0)) {
            setError(t("inventory.modal.quantityInvalid"));
            return;
        }
        setSaving(true);
        try {
            await onSubmit({
                productId,
                type,
                quantity: q,
                reason: reason.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e.response?.data?.error || e.response?.data?.message || t("inventory.modal.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={t("inventory.modal.title", { name: productName })}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {t("common.create")}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                        {error}
                    </div>
                )}

                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t("inventory.modal.onHand")}</span>
                        <span className="tabular font-medium text-gray-900 dark:text-gray-50">{row.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t("inventory.modal.reserved")}</span>
                        <span className="tabular text-gray-900 dark:text-gray-50">{row.reservedQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-1.5 pt-1.5">
                        <span className="text-gray-500 dark:text-gray-400">{t("inventory.modal.available")}</span>
                        <span className="tabular font-semibold text-gray-900 dark:text-gray-50">{row.availableQuantity}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("inventory.modal.type")}>
                        <Select value={type} onChange={(e) => setType(e.target.value as InventoryMovementType)}>
                            {TYPES.map((tp) => (
                                <option key={tp} value={tp}>{t(`inventory.types.${tp}`)}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t("inventory.modal.quantity")} hint={type === "adjustment" ? t("inventory.modal.adjustmentHint") : undefined}>
                        <Input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    </Field>
                </div>

                <Field label={t("inventory.modal.reason")}>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("inventory.modal.reasonPlaceholder")} />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
