"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency } from "@/lib/format";
import type { PurchaseOrderPayload } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { Product, Supplier } from "@/types";

interface DraftLine {
    key: string;
    productId: string;
    quantity: string;
    unitCost: string;
}

interface PurchaseOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    suppliers: Supplier[];
    products: Product[];
    onSubmit: (payload: PurchaseOrderPayload) => Promise<void>;
}

let lineCounter = 0;
const newLine = (): DraftLine => ({ key: `po${++lineCounter}`, productId: "", quantity: "1", unitCost: "0" });

export function PurchaseOrderModal({ isOpen, onClose, suppliers, products, onSubmit }: PurchaseOrderModalProps) {
    const { t, locale } = useAdminI18n();
    const [supplierId, setSupplierId] = useState("");
    const [lines, setLines] = useState<DraftLine[]>([newLine()]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setSupplierId("");
        setLines([newLine()]);
        setNotes("");
        setSaving(false);
        setError(null);
    }, [isOpen]);

    const total = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0),
        [lines],
    );

    if (!isOpen) return null;

    const setLine = (key: string, patch: Partial<DraftLine>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const onProductChange = (key: string, productId: string) => {
        const product = products.find((p) => p._id === productId);
        setLine(key, { productId, unitCost: product?.costPrice != null ? String(product.costPrice) : "0" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) { setError(t("purchaseOrders.modal.supplierRequired")); return; }
        const items = [];
        for (const l of lines) {
            if (!l.productId) continue;
            const q = parseFloat(l.quantity);
            const c = parseFloat(l.unitCost);
            if (!q || q <= 0 || isNaN(c) || c < 0) { setError(t("purchaseOrders.modal.lineInvalid")); return; }
            items.push({ productId: l.productId, quantity: q, unitCost: c });
        }
        if (items.length === 0) { setError(t("purchaseOrders.modal.noItems")); return; }
        setSaving(true);
        setError(null);
        try {
            await onSubmit({ supplierId, items, notes: notes.trim() || undefined });
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e.response?.data?.error || t("purchaseOrders.modal.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={t("purchaseOrders.modal.title")}
            footer={
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {t("purchaseOrders.modal.total")}: <span className="tabular">{formatCurrency(total, "ILS", locale as Locale)}</span>
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                        <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>{t("common.create")}</Button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                        {error}
                    </div>
                )}
                <Field label={t("purchaseOrders.modal.supplier")} required>
                    <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                        <option value="">{t("purchaseOrders.modal.selectSupplier")}</option>
                        {suppliers.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </Select>
                </Field>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("purchaseOrders.modal.items")}</span>
                        <Button type="button" size="sm" variant="outline" iconStart={<Plus size={14} />} onClick={() => setLines((p) => [...p, newLine()])}>
                            {t("purchaseOrders.modal.addLine")}
                        </Button>
                    </div>
                    {lines.map((line) => (
                        <div key={line.key} className="grid grid-cols-12 gap-2">
                            <div className="col-span-12 sm:col-span-6">
                                <Select value={line.productId} onChange={(e) => onProductChange(line.key, e.target.value)}>
                                    <option value="">{t("purchaseOrders.modal.selectProduct")}</option>
                                    {products.map((p) => (
                                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-span-5 sm:col-span-2">
                                <Input type="number" min="1" step="1" aria-label={t("purchaseOrders.modal.qty")}
                                    value={line.quantity} onChange={(e) => setLine(line.key, { quantity: e.target.value })} />
                            </div>
                            <div className="col-span-5 sm:col-span-3">
                                <Input type="number" min="0" step="0.01" aria-label={t("purchaseOrders.modal.unitCost")}
                                    value={line.unitCost} onChange={(e) => setLine(line.key, { unitCost: e.target.value })} />
                            </div>
                            <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                                <button
                                    type="button"
                                    aria-label={t("purchaseOrders.modal.removeLine")}
                                    disabled={lines.length === 1}
                                    onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}
                                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <Field label={t("purchaseOrders.modal.notes")}>
                    <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
