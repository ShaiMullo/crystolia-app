"use client";

// Opening-stock entry for products that have no Inventory row yet (and
// additive receipts for ones that do). Always records a type:"in" movement
// through the existing movements endpoint — the backend creates the Inventory
// row on the first movement, so no row is ever fabricated client-side and an
// existing on-hand quantity can never be overwritten from here.

import React, { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Product } from "@/types";
import type { MovementPayload } from "@/lib/inventoryApi";

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Active, non-deleted products (the page filters before passing). */
    products: Product[];
    /** Ids of stock-tracked products with no `main` Inventory row yet. */
    missingProductIds: Set<string>;
    onSubmit: (payload: MovementPayload) => Promise<void>;
}

export function AddStockModal({ isOpen, onClose, products, missingProductIds, onSubmit }: AddStockModalProps) {
    const { t } = useAdminI18n();
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("main");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setProductId("");
        setQuantity("");
        setLocation("main");
        setReason("");
        setError(null);
        setSaving(false);
    }, [isOpen]);

    // Products still missing a row come first — that is the workflow this
    // modal exists for. Untracked products stay listed but disabled so the
    // admin sees WHY they cannot receive inventory.
    const orderedProducts = useMemo(() => {
        const seen = new Set<string>();
        return products
            .filter((p) => (seen.has(p._id) ? false : (seen.add(p._id), true)))
            .sort((a, b) => {
                const missingDelta =
                    Number(missingProductIds.has(b._id)) - Number(missingProductIds.has(a._id));
                if (missingDelta !== 0) return missingDelta;
                return a.name.localeCompare(b.name);
            });
    }, [products, missingProductIds]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        if (!productId) {
            setError(t("inventory.addStock.productRequired"));
            return;
        }
        const q = Number(quantity);
        if (!Number.isFinite(q) || q <= 0) {
            setError(t("inventory.addStock.quantityInvalid"));
            return;
        }
        const trimmedLocation = location.trim();
        if (!trimmedLocation) {
            setError(t("inventory.addStock.locationRequired"));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSubmit({
                productId,
                type: "in",
                quantity: q,
                location: trimmedLocation,
                reason: reason.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const e2 = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e2.response?.data?.error || e2.response?.data?.message || t("inventory.addStock.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={t("inventory.addStock.title")}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {t("common.save")}
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

                <p className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm text-gray-600 dark:text-gray-300">
                    {t("inventory.addStock.explain")}
                </p>

                <Field label={t("inventory.addStock.product")}>
                    <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                        <option value="">{t("inventory.addStock.productPlaceholder")}</option>
                        {orderedProducts.map((p) => (
                            <option key={p._id} value={p._id} disabled={!p.stockTrackingEnabled}>
                                {p.name} — {p.sku}
                                {!p.stockTrackingEnabled ? ` (${t("inventory.addStock.untracked")})` : ""}
                                {missingProductIds.has(p._id) ? ` · ${t("inventory.addStock.noRowYet")}` : ""}
                            </option>
                        ))}
                    </Select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("inventory.addStock.quantity")}>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                        />
                    </Field>
                    <Field label={t("inventory.addStock.location")}>
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                    </Field>
                </div>

                <Field label={t("inventory.addStock.reason")}>
                    <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t("inventory.addStock.reasonPlaceholder")}
                    />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
