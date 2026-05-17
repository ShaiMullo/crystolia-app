"use client";

import React, { useEffect, useState } from "react";
import {
    Button,
    Field,
    Input,
    Modal,
    Select,
    Textarea,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Product, ProductUnit } from "@/types";
import type { ProductPayload } from "@/lib/inventoryApi";

const UNITS: ProductUnit[] = ["unit", "box", "liter", "kg", "gram", "package"];

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSubmit: (payload: ProductPayload) => Promise<void>;
}

export function ProductModal({ isOpen, onClose, product, onSubmit }: ProductModalProps) {
    const { t } = useAdminI18n();
    const isEdit = !!product;

    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [unit, setUnit] = useState<ProductUnit>("unit");
    const [price, setPrice] = useState("0");
    const [costPrice, setCostPrice] = useState("");
    const [currency, setCurrency] = useState("ILS");
    const [taxRate, setTaxRate] = useState("17");
    const [supplier, setSupplier] = useState("");
    const [barcode, setBarcode] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [stockTrackingEnabled, setStockTrackingEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (product) {
            setName(product.name);
            setSku(product.sku);
            setCategory(product.category || "");
            setDescription(product.description || "");
            setUnit(product.unit);
            setPrice(String(product.price));
            setCostPrice(product.costPrice != null ? String(product.costPrice) : "");
            setCurrency(product.currency || "ILS");
            setTaxRate(String(product.taxRate));
            setSupplier(product.supplier || "");
            setBarcode(product.barcode || "");
            setIsActive(product.isActive);
            setStockTrackingEnabled(product.stockTrackingEnabled);
        } else {
            setName("");
            setSku("");
            setCategory("");
            setDescription("");
            setUnit("unit");
            setPrice("0");
            setCostPrice("");
            setCurrency("ILS");
            setTaxRate("17");
            setSupplier("");
            setBarcode("");
            setIsActive(true);
            setStockTrackingEnabled(true);
        }
        setSaving(false);
        setError(null);
    }, [isOpen, product]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !sku.trim()) {
            setError(t("products.modal.nameSkuRequired"));
            return;
        }
        const parsedPrice = parseFloat(price);
        const parsedTax = parseFloat(taxRate);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            setError(t("products.modal.priceInvalid"));
            return;
        }
        if (isNaN(parsedTax) || parsedTax < 0 || parsedTax > 100) {
            setError(t("products.modal.taxInvalid"));
            return;
        }
        const parsedCost = costPrice.trim() === "" ? undefined : parseFloat(costPrice);
        if (parsedCost !== undefined && (isNaN(parsedCost) || parsedCost < 0)) {
            setError(t("products.modal.costInvalid"));
            return;
        }
        setSaving(true);
        try {
            await onSubmit({
                name: name.trim(),
                sku: sku.trim(),
                category: category.trim() || undefined,
                description: description.trim() || undefined,
                unit,
                price: parsedPrice,
                costPrice: parsedCost,
                currency: currency.trim().toUpperCase(),
                taxRate: parsedTax,
                supplier: supplier.trim() || undefined,
                barcode: barcode.trim() || undefined,
                isActive,
                stockTrackingEnabled,
            });
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e.response?.data?.error || e.response?.data?.message || t("products.modal.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    // Margin hint — only shown when both price and cost are valid.
    const marginHint = (() => {
        const p = parseFloat(price);
        const c = parseFloat(costPrice);
        if (isNaN(p) || isNaN(c) || p <= 0 || c < 0) return undefined;
        const marginPct = Math.round(((p - c) / p) * 100);
        return t("products.modal.marginHint", { pct: marginPct });
    })();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={isEdit ? t("products.modal.editTitle", { name: product?.name || "" }) : t("products.modal.createTitle")}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {isEdit ? t("common.save") : t("common.create")}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("products.fields.name")} required>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                    </Field>
                    <Field label={t("products.fields.sku")} required>
                        <Input value={sku} onChange={(e) => setSku(e.target.value)} required disabled={isEdit} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("products.fields.category")}>
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                    </Field>
                    <Field label={t("products.fields.unit")}>
                        <Select value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)}>
                            {UNITS.map((u) => (
                                <option key={u} value={u}>{t(`products.units.${u}`)}</option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label={t("products.fields.price")}>
                        <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                    </Field>
                    <Field label={t("products.fields.currency")}>
                        <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="ILS">ILS</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </Select>
                    </Field>
                    <Field label={t("products.fields.taxRate")}>
                        <Input type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label={t("products.fields.costPrice")} hint={marginHint}>
                        <Input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </Field>
                    <Field label={t("products.fields.supplier")}>
                        <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                    </Field>
                    <Field label={t("products.fields.barcode")}>
                        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                    </Field>
                </div>

                <Field label={t("products.fields.description")}>
                    <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="h-4 w-4 rounded text-yellow-500 border-gray-300 focus:ring-yellow-500 dark:border-gray-700 dark:bg-gray-900"
                        />
                        {t("products.fields.isActive")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            checked={stockTrackingEnabled}
                            onChange={(e) => setStockTrackingEnabled(e.target.checked)}
                            className="h-4 w-4 rounded text-yellow-500 border-gray-300 focus:ring-yellow-500 dark:border-gray-700 dark:bg-gray-900"
                        />
                        {t("products.fields.stockTracking")}
                    </label>
                </div>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
