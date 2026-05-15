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
import type { Customer, CustomerStatus, User } from "@/types";

const STATUSES: CustomerStatus[] = ["active", "inactive", "on-hold", "archived"];

export interface CustomerEditPayload {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    status?: CustomerStatus;
    tags?: string[];
    assignedTo?: string;
    note?: string;
    companyName?: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
}

interface CustomerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    agents: User[];
    onSave: (payload: CustomerEditPayload) => Promise<void>;
}

export default function CustomerEditModal({ isOpen, onClose, customer, agents, onSave }: CustomerEditModalProps) {
    const { t } = useAdminI18n();
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [status, setStatus] = useState<CustomerStatus>("active");
    const [tags, setTags] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [note, setNote] = useState("");

    const [companyName, setCompanyName] = useState("");
    const [vatNumber, setVatNumber] = useState("");
    const [city, setCity] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !customer) return;
        setContactName(customer.contactName || "");
        setContactEmail(customer.contactEmail || "");
        setContactPhone(customer.contactPhone || "");
        setStatus(customer.status);
        setTags((customer.tags || []).join(", "));
        const agentId = typeof customer.assignedTo === "object" && customer.assignedTo ? customer.assignedTo._id : (customer.assignedTo as string) || "";
        setAssignedTo(agentId || "");
        setNote("");

        const c = typeof customer.company === "object" ? customer.company : null;
        setCompanyName(c?.name || "");
        setVatNumber(c?.vatNumber || "");
        setCity(c?.city || "");
        setAddress(c?.address || "");
        setPhone(c?.phone || "");
        setEmail(c?.email || "");
    }, [isOpen, customer]);

    if (!isOpen || !customer) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                contactName: contactName.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
                contactPhone: contactPhone.trim() || undefined,
                status,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                assignedTo: assignedTo.trim() || undefined,
                note: note.trim() || undefined,
                companyName: companyName.trim() || undefined,
                vatNumber: vatNumber.trim() || undefined,
                city: city.trim() || undefined,
                address: address.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const titleName = typeof customer.company === "object" ? customer.company.name : t("customers.modal.edit");

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={t("customers.modal.editTitle", { name: titleName })}
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {saving ? t("common.saving") : t("common.save")}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <section>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">{t("customers.modal.crmSection")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label={t("customers.modal.status")}>
                            <Select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)}>
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>{t(`customerStatus.${s}`)}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={t("customers.modal.assignedTo")}>
                            <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                                <option value="">{t("customers.modal.unassigned")}</option>
                                {agents.map((a) => (
                                    <option key={a._id} value={a._id}>{a.name || a.email}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <Field label={t("customers.modal.contactName")}>
                            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        </Field>
                        <Field label={t("customers.modal.contactPhone")}>
                            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                        </Field>
                    </div>
                    <div className="mt-3">
                        <Field label={t("customers.modal.contactEmail")}>
                            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                        </Field>
                    </div>
                    <div className="mt-3">
                        <Field label={t("customers.modal.tagsLabel")} hint={t("customers.modal.tagsHint")}>
                            <Input
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder={t("customers.modal.tagsPlaceholder")}
                            />
                        </Field>
                    </div>
                    <div className="mt-3">
                        <Field label={t("customers.modal.addNote")} hint={t("customers.modal.addNoteHint")}>
                            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                        </Field>
                    </div>
                </section>

                <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">{t("customers.modal.companySection")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label={t("convert.fields.companyName")}>
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.vatNumber")}>
                            <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.city")}>
                            <Input value={city} onChange={(e) => setCity(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.address")}>
                            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.phone")}>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.email")}>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </Field>
                    </div>
                </section>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
