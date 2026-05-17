"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import {
    Button,
    Field,
    Input,
    Modal,
    Select,
    Textarea,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency } from "@/lib/format";
import { previewOrder, type OrderItemInput, type OrderUpsertPayload } from "@/lib/ordersApi";
import type { Locale } from "@/i18n";
import type { Customer, Order, OrderInventoryPreviewLine, Product } from "@/types";

interface DraftLine {
    key: string;
    productId: string;
    productName: string;
    quantity: string;
    price: string;
    taxRate: string;
}

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;            // null = create
    customers: Customer[];
    products: Product[];
    onSubmit: (payload: OrderUpsertPayload) => Promise<void>;
}

let lineCounter = 0;
const newLine = (): DraftLine => ({
    key: `l${++lineCounter}`,
    productId: "",
    productName: "",
    quantity: "1",
    price: "0",
    taxRate: "0",
});

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function OrderModal({ isOpen, onClose, order, customers, products, onSubmit }: OrderModalProps) {
    const { t, locale } = useAdminI18n();
    const isEdit = !!order;
    const editable = !isEdit || order?.status === "pending";

    const [customerId, setCustomerId] = useState("");
    const [lines, setLines] = useState<DraftLine[]>([newLine()]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<OrderInventoryPreviewLine[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setSaving(false);
        setPreview([]);
        if (order) {
            setNotes(order.notes || "");
            setLines(
                (order.items || []).map((it) => ({
                    key: `l${++lineCounter}`,
                    productId: it.productId || "",
                    productName: it.productName || "",
                    quantity: String(it.quantity ?? 1),
                    price: String(it.price ?? 0),
                    taxRate: String(it.taxRate ?? 0),
                })),
            );
            // company is fixed for existing orders; customer selector hidden
            setCustomerId("");
        } else {
            setCustomerId("");
            setLines([newLine()]);
            setNotes("");
        }
    }, [isOpen, order]);

    // Local totals — mirrors backend orderService rounding.
    const totals = useMemo(() => {
        let subtotal = 0;
        let taxTotal = 0;
        for (const l of lines) {
            const q = parseFloat(l.quantity) || 0;
            const p = parseFloat(l.price) || 0;
            const tr = parseFloat(l.taxRate) || 0;
            const ls = round2(q * p);
            subtotal += ls;
            taxTotal += round2(ls * (tr / 100));
        }
        subtotal = round2(subtotal);
        taxTotal = round2(taxTotal);
        return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
    }, [lines]);

    // Debounced inventory preview when product-bearing lines change.
    useEffect(() => {
        if (!isOpen) return;
        const productLines = lines.filter((l) => l.productId);
        if (productLines.length === 0) {
            setPreview([]);
            return;
        }
        const handle = setTimeout(async () => {
            try {
                const items: OrderItemInput[] = productLines.map((l) => ({
                    productId: l.productId,
                    productName: l.productName,
                    quantity: parseFloat(l.quantity) || 0,
                    price: parseFloat(l.price) || 0,
                    taxRate: parseFloat(l.taxRate) || 0,
                }));
                const res = await previewOrder(items);
                setPreview(res.preview);
            } catch {
                setPreview([]);
            }
        }, 450);
        return () => clearTimeout(handle);
    }, [isOpen, lines]);

    if (!isOpen) return null;

    const setLine = (key: string, patch: Partial<DraftLine>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const onProductChange = (key: string, productId: string) => {
        const product = products.find((p) => p._id === productId);
        if (product) {
            setLine(key, {
                productId,
                productName: product.name,
                price: String(product.price),
                taxRate: String(product.taxRate ?? 0),
            });
        } else {
            setLine(key, { productId: "", productName: "" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEdit && !customerId) {
            setError(t("orders.modal.customerRequired"));
            return;
        }
        const items: OrderItemInput[] = [];
        for (const l of lines) {
            const q = parseFloat(l.quantity);
            const p = parseFloat(l.price);
            if (!l.productName.trim() && !l.productId) continue;
            if (!q || q <= 0 || isNaN(p) || p < 0) {
                setError(t("orders.modal.lineInvalid"));
                return;
            }
            items.push({
                productId: l.productId || undefined,
                productName: l.productName.trim(),
                quantity: q,
                price: p,
                taxRate: parseFloat(l.taxRate) || undefined,
            });
        }
        if (items.length === 0) {
            setError(t("orders.modal.noItems"));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload: OrderUpsertPayload = { items, notes: notes.trim() || undefined };
            if (!isEdit) payload.customerId = customerId;
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e.response?.data?.error || e.response?.data?.message || t("orders.modal.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const previewFor = (productId: string) => preview.find((p) => p.productId === productId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={isEdit ? t("orders.modal.editTitle") : t("orders.modal.createTitle")}
            footer={
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="me-3">{t("orders.modal.subtotal")}: <span className="tabular font-medium">{formatCurrency(totals.subtotal, "ILS", locale as Locale)}</span></span>
                        <span className="me-3">{t("orders.modal.tax")}: <span className="tabular font-medium">{formatCurrency(totals.taxTotal, "ILS", locale as Locale)}</span></span>
                        <span className="font-semibold text-gray-900 dark:text-gray-50">{t("orders.modal.total")}: <span className="tabular">{formatCurrency(totals.total, "ILS", locale as Locale)}</span></span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                        <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving} disabled={!editable}>
                            {isEdit ? t("common.save") : t("common.create")}
                        </Button>
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
                {!editable && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
                        {t("orders.modal.lockedHint")}
                    </div>
                )}

                {!isEdit && (
                    <Field label={t("orders.modal.customer")} required>
                        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                            <option value="">{t("orders.modal.selectCustomer")}</option>
                            {customers.map((c) => {
                                const name = typeof c.company === "object" ? c.company.name : t("orders.modal.unknownCompany");
                                return <option key={c._id} value={c._id}>{name}{c.contactName ? ` — ${c.contactName}` : ""}</option>;
                            })}
                        </Select>
                    </Field>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("orders.modal.items")}</span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            iconStart={<Plus size={14} />}
                            disabled={!editable}
                            onClick={() => setLines((prev) => [...prev, newLine()])}
                        >
                            {t("orders.modal.addLine")}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {lines.map((line) => {
                            const pv = line.productId ? previewFor(line.productId) : undefined;
                            return (
                                <div key={line.key} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5">
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-12 sm:col-span-5">
                                            <Select
                                                value={line.productId}
                                                disabled={!editable}
                                                onChange={(e) => onProductChange(line.key, e.target.value)}
                                            >
                                                <option value="">{t("orders.modal.customLine")}</option>
                                                {products.filter((p) => p.isActive).map((p) => (
                                                    <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                                ))}
                                            </Select>
                                            {!line.productId && (
                                                <Input
                                                    className="mt-1.5"
                                                    placeholder={t("orders.modal.itemName")}
                                                    value={line.productName}
                                                    disabled={!editable}
                                                    onChange={(e) => setLine(line.key, { productName: e.target.value })}
                                                />
                                            )}
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input
                                                type="number" min="1" step="1"
                                                aria-label={t("orders.modal.qty")}
                                                value={line.quantity}
                                                disabled={!editable}
                                                onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input
                                                type="number" min="0" step="0.01"
                                                aria-label={t("orders.modal.price")}
                                                value={line.price}
                                                disabled={!editable}
                                                onChange={(e) => setLine(line.key, { price: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 sm:col-span-2">
                                            <Input
                                                type="number" min="0" max="100" step="0.5"
                                                aria-label={t("orders.modal.taxRate")}
                                                value={line.taxRate}
                                                disabled={!editable}
                                                onChange={(e) => setLine(line.key, { taxRate: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 flex items-center justify-end">
                                            <button
                                                type="button"
                                                aria-label={t("orders.modal.removeLine")}
                                                disabled={!editable || lines.length === 1}
                                                onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                                                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {pv && (
                                        <div className={`mt-1.5 flex items-center gap-1 text-xs ${pv.sufficient ? "text-emerald-600" : "text-red-600"}`}>
                                            {pv.sufficient ? <Check size={12} /> : <AlertTriangle size={12} />}
                                            {pv.available === null
                                                ? t("orders.modal.notTracked")
                                                : t("orders.modal.availableStock", { count: pv.available })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Field label={t("orders.modal.notes")}>
                    <Textarea rows={2} value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
