"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Field,
    Input,
    Modal,
    Select,
    Textarea,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, shortId } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { InvoiceStatus, Order } from "@/types";

export interface InvoicePayload {
    company: string;
    order?: string;
    invoiceNumber: string;
    totalAmount: number;
    status: InvoiceStatus;
    dueDate?: string;
    notes?: string;
}

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    onCreate: (payload: InvoicePayload) => Promise<void>;
}

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

const getCompanyName = (order: Order): string => {
    if (!order.company) return "—";
    if (typeof order.company === "object") return order.company.name;
    return order.company;
};

export function CreateInvoiceModal({ isOpen, onClose, orders, onCreate }: CreateInvoiceModalProps) {
    const { t, locale } = useAdminI18n();
    const [orderId, setOrderId] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [status, setStatus] = useState<InvoiceStatus>("draft");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<{ invoiceNumber?: string; totalAmount?: string; companyId?: string }>({});

    useEffect(() => {
        if (isOpen) {
            setOrderId("");
            setCompanyId("");
            setInvoiceNumber("");
            setTotalAmount("");
            setStatus("draft");
            setDueDate("");
            setNotes("");
            setSaving(false);
            setErrors({});
        }
    }, [isOpen]);

    const orderOptions = orders.filter((o) => o.company && typeof o.company === "object");

    const handleOrderChange = (id: string) => {
        const order = orders.find((o) => o._id === id);
        const newCompanyId = order && typeof order.company === "object" ? order.company._id : "";
        setOrderId(id);
        setCompanyId(newCompanyId);
        if (order) setTotalAmount(order.totalAmount.toString());
    };

    const handleSubmit = async () => {
        const next: typeof errors = {};
        if (!invoiceNumber.trim()) next.invoiceNumber = t("invoices.toasts.invoiceNumberRequired");
        const parsed = parseFloat(totalAmount);
        if (isNaN(parsed) || parsed < 0) next.totalAmount = t("invoices.toasts.amountRequired");
        if (!companyId) next.companyId = t("invoices.toasts.orderRequired");
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setSaving(true);
        try {
            await onCreate({
                company: companyId,
                ...(orderId && { order: orderId }),
                invoiceNumber: invoiceNumber.trim(),
                totalAmount: parsed,
                status,
                ...(dueDate && { dueDate }),
                ...(notes.trim() && { notes: notes.trim() }),
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("invoices.create.title")}
            size="md"
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} loading={saving}>
                        {saving ? t("invoices.create.submitting") : t("invoices.create.submit")}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <Field
                    label={t("invoices.create.linkedOrder")}
                    optional={t("invoices.create.linkedOrderHelp")}
                    error={errors.companyId}
                    hint={companyId && !errors.companyId ? t("invoices.create.companyLinked") : undefined}
                >
                    <Select value={orderId} onChange={(e) => handleOrderChange(e.target.value)}>
                        <option value="">{t("invoices.create.selectOrder")}</option>
                        {orderOptions.map((o) => (
                            <option key={o._id} value={o._id}>
                                {shortId(o._id)} · {getCompanyName(o)} · {formatCurrency(o.totalAmount, "ILS", locale as Locale)}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label={t("invoices.create.invoiceNumber")} required error={errors.invoiceNumber}>
                    <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder={t("invoices.create.invoiceNumberPlaceholder")}
                        invalid={!!errors.invoiceNumber}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label={t("invoices.create.totalAmount")} required error={errors.totalAmount}>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            invalid={!!errors.totalAmount}
                        />
                    </Field>
                    <Field label={t("invoices.create.status")}>
                        <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                            {INVOICE_STATUSES.map((s) => (
                                <option key={s} value={s}>{t(`invoiceStatus.${s}`)}</option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <Field label={t("invoices.create.dueDate")} optional={t("common.optional")}>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>

                <Field label={t("invoices.create.notes")} optional={t("common.optional")}>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
            </div>
        </Modal>
    );
}
