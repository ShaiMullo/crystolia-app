"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

export interface CreateLeadPayload {
    name: string;
    companyName?: string;
    phone: string;
    email?: string;
    message?: string;
    source: "manual_entry";
}

interface CreateLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (payload: CreateLeadPayload) => Promise<void>;
}

function isPlausiblePhone(raw: string): boolean {
    const visible = raw.replace(/[\u200B-\u200F\u2060\u2066-\u2069\u202A-\u202E\uFEFF]/g, "").trim();
    const digits = visible.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 && /^[+0-9()\-.\s]+$/.test(visible);
}

export default function CreateLeadModal({ isOpen, onClose, onCreate }: CreateLeadModalProps) {
    const { t } = useAdminI18n();
    const [name, setName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [nameError, setNameError] = useState(false);
    const [phoneError, setPhoneError] = useState<"required" | "invalid" | false>(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setCompanyName("");
        setPhone("");
        setEmail("");
        setMessage("");
        setNameError(false);
        setPhoneError(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const cleanName = name.trim();
        const cleanPhone = phone.trim();
        const nextNameError = cleanName.length === 0;
        const nextPhoneError = cleanPhone.length === 0
            ? "required"
            : !isPlausiblePhone(cleanPhone)
                ? "invalid"
                : false;

        setNameError(nextNameError);
        setPhoneError(nextPhoneError);
        if (nextNameError || nextPhoneError) return;

        setLoading(true);
        try {
            await onCreate({
                name: cleanName,
                companyName: companyName.trim() || undefined,
                phone: cleanPhone,
                email: email.trim() || undefined,
                message: message.trim() || undefined,
                source: "manual_entry",
            });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("leads.create.title")}
            description={t("leads.create.description")}
            size="md"
            persistent={loading}
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="min-h-11">
                        {t("common.cancel")}
                    </Button>
                    <Button type="submit" form="create-lead-form" loading={loading} className="min-h-11">
                        {loading ? t("common.creating") : t("leads.create.submit")}
                    </Button>
                </div>
            }
        >
            <form id="create-lead-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Field
                    label={t("leads.create.name")}
                    htmlFor="create-lead-name"
                    required
                    error={nameError ? t("common.required") : undefined}
                >
                    <Input
                        id="create-lead-name"
                        autoFocus
                        autoComplete="name"
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value);
                            setNameError(false);
                        }}
                        invalid={nameError}
                        aria-invalid={nameError}
                        aria-describedby={nameError ? "create-lead-name-error" : undefined}
                    />
                    {nameError && <span id="create-lead-name-error" className="sr-only">{t("common.required")}</span>}
                </Field>

                <Field label={t("leads.create.companyName")} htmlFor="create-lead-company" optional={t("common.optional")}>
                    <Input
                        id="create-lead-company"
                        autoComplete="organization"
                        maxLength={120}
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                    />
                </Field>

                <Field
                    label={t("leads.create.phone")}
                    htmlFor="create-lead-phone"
                    required
                    error={phoneError ? t(phoneError === "required" ? "common.required" : "leads.create.phoneInvalid") : undefined}
                >
                    <Input
                        id="create-lead-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => {
                            setPhone(event.target.value);
                            setPhoneError(false);
                        }}
                        invalid={Boolean(phoneError)}
                        aria-invalid={Boolean(phoneError)}
                        aria-describedby={phoneError ? "create-lead-phone-error" : undefined}
                    />
                    {phoneError && (
                        <span id="create-lead-phone-error" className="sr-only">
                            {t(phoneError === "required" ? "common.required" : "leads.create.phoneInvalid")}
                        </span>
                    )}
                </Field>

                <Field label={t("leads.create.email")} htmlFor="create-lead-email" optional={t("common.optional")}>
                    <Input
                        id="create-lead-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </Field>

                <Field label={t("leads.create.message")} htmlFor="create-lead-message" optional={t("common.optional")}>
                    <Textarea
                        id="create-lead-message"
                        rows={4}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={t("leads.create.messagePlaceholder")}
                    />
                </Field>
            </form>
        </Modal>
    );
}
