"use client";

import React, { useEffect, useState } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Supplier } from "@/types";
import type { SupplierPayload } from "@/lib/opsApi";

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
    onSubmit: (payload: SupplierPayload) => Promise<void>;
}

export function SupplierModal({ isOpen, onClose, supplier, onSubmit }: SupplierModalProps) {
    const { t } = useAdminI18n();
    const isEdit = !!supplier;
    const [name, setName] = useState("");
    const [contactName, setContactName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [address, setAddress] = useState("");
    const [vatNumber, setVatNumber] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName(supplier?.name || "");
        setContactName(supplier?.contactName || "");
        setEmail(supplier?.email || "");
        setPhone(supplier?.phone || "");
        setCity(supplier?.city || "");
        setAddress(supplier?.address || "");
        setVatNumber(supplier?.vatNumber || "");
        setSaving(false);
        setError(null);
    }, [isOpen, supplier]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError(t("suppliers.modal.nameRequired")); return; }
        setSaving(true);
        try {
            await onSubmit({
                name: name.trim(),
                contactName: contactName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                city: city.trim() || undefined,
                address: address.trim() || undefined,
                vatNumber: vatNumber.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e.response?.data?.error || t("suppliers.modal.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={isEdit ? t("suppliers.modal.editTitle") : t("suppliers.modal.createTitle")}
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
                <Field label={t("suppliers.fields.name")} required>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("suppliers.fields.contactName")}>
                        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                    </Field>
                    <Field label={t("suppliers.fields.vatNumber")}>
                        <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                    </Field>
                    <Field label={t("suppliers.fields.email")}>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Field>
                    <Field label={t("suppliers.fields.phone")}>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </Field>
                    <Field label={t("suppliers.fields.city")}>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </Field>
                    <Field label={t("suppliers.fields.address")}>
                        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                    </Field>
                </div>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
