"use client";

import React, { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency } from "@/lib/format";
import { postPayment, type PaymentPayload } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { Invoice, PaymentMethod } from "@/types";

const METHODS: PaymentMethod[] = ["bank_transfer", "cash", "credit_card", "check", "other"];

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** When set, the invoice is fixed; otherwise the user picks from `invoices`. */
    fixedInvoice?: Invoice | null;
    invoices?: Invoice[];
    onPosted: () => void;
}

export function PaymentModal({ isOpen, onClose, fixedInvoice, invoices = [], onPosted }: PaymentModalProps) {
    const { t, locale } = useAdminI18n();
    const [invoiceId, setInvoiceId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
    const [externalRef, setExternalRef] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setInvoiceId(fixedInvoice?._id || "");
        const outstanding = fixedInvoice ? fixedInvoice.totalAmount - (fixedInvoice.amountPaid || 0) : 0;
        setAmount(outstanding > 0 ? String(outstanding) : "");
        setMethod("bank_transfer");
        setExternalRef("");
        setNotes("");
        setSaving(false);
        setError(null);
    }, [isOpen, fixedInvoice]);

    if (!isOpen) return null;

    const selectedInvoice = fixedInvoice || invoices.find((i) => i._id === invoiceId);
    const outstanding = selectedInvoice ? selectedInvoice.totalAmount - (selectedInvoice.amountPaid || 0) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceId) { setError(t("payments.modal.invoiceRequired")); return; }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) { setError(t("payments.modal.amountInvalid")); return; }
        setSaving(true);
        setError(null);
        try {
            const payload: PaymentPayload = {
                invoiceId,
                amount: amt,
                method,
                externalRef: externalRef.trim() || undefined,
                notes: notes.trim() || undefined,
            };
            await postPayment(payload);
            onPosted();
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e.response?.data?.error || e.response?.data?.message || t("payments.modal.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={t("payments.modal.title")}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {t("payments.modal.post")}
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

                {fixedInvoice ? (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t("payments.modal.invoice")}</span>
                            <span className="font-mono">{fixedInvoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-500 dark:text-gray-400">{t("payments.modal.outstanding")}</span>
                            <span className="tabular font-medium">{formatCurrency(outstanding, "ILS", locale as Locale)}</span>
                        </div>
                    </div>
                ) : (
                    <Field label={t("payments.modal.invoice")} required>
                        <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                            <option value="">{t("payments.modal.selectInvoice")}</option>
                            {invoices.map((inv) => (
                                <option key={inv._id} value={inv._id}>
                                    {inv.invoiceNumber} · {formatCurrency(inv.totalAmount, "ILS", locale as Locale)}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("payments.modal.amount")} required hint={outstanding > 0 ? t("payments.modal.outstandingHint", { amount: formatCurrency(outstanding, "ILS", locale as Locale) }) : undefined}>
                        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </Field>
                    <Field label={t("payments.modal.method")}>
                        <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                            {METHODS.map((m) => (
                                <option key={m} value={m}>{t(`payments.methods.${m}`)}</option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <Field label={t("payments.modal.externalRef")}>
                    <Input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder={t("payments.modal.externalRefPlaceholder")} />
                </Field>
                <Field label={t("payments.modal.notes")}>
                    <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
