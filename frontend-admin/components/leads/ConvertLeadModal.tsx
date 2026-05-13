"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import {
    Button,
    Field,
    Input,
    Modal,
    Textarea,
} from "@/components/ui";
import { Lead } from "@/types";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface ConvertResultCompany {
    _id: string;
    name: string;
    vatNumber?: string;
}

interface ConvertResultUser {
    _id: string;
    name?: string;
    email: string;
}

export interface ConvertSubmitPayload {
    companyName: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    userName?: string;
    password?: string;
    note?: string;
}

export interface ConvertSubmitResult {
    success: boolean;
    idempotent?: boolean;
    company?: ConvertResultCompany | null;
    user?: ConvertResultUser | null;
    tempPassword?: string;
}

interface ConvertLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSubmit: (payload: ConvertSubmitPayload) => Promise<ConvertSubmitResult>;
    onSuccess: () => void;
}

export default function ConvertLeadModal({ isOpen, onClose, lead, onSubmit, onSuccess }: ConvertLeadModalProps) {
    const { t } = useAdminI18n();
    const [companyName, setCompanyName] = useState("");
    const [vatNumber, setVatNumber] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [note, setNote] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ConvertSubmitResult | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && lead) {
            setCompanyName(lead.name || "");
            setVatNumber("");
            setAddress("");
            setCity("");
            setPhone(lead.phone || "");
            setEmail(lead.email || "");
            setUserName(lead.name || "");
            setPassword("");
            setNote("");
            setError(null);
            setResult(null);
            setCopied(false);
            setLoading(false);
        }
    }, [isOpen, lead]);

    const trimmedCompanyName = useMemo(() => companyName.trim(), [companyName]);
    const canSubmit = !loading && trimmedCompanyName.length > 0;

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError(null);
        try {
            const payload: ConvertSubmitPayload = { companyName: trimmedCompanyName };
            if (vatNumber.trim()) payload.vatNumber = vatNumber.trim();
            if (address.trim()) payload.address = address.trim();
            if (city.trim()) payload.city = city.trim();
            if (phone.trim()) payload.phone = phone.trim();
            if (email.trim()) payload.email = email.trim();
            if (userName.trim()) payload.userName = userName.trim();
            if (password.trim()) payload.password = password.trim();
            if (note.trim()) payload.note = note.trim();

            const res = await onSubmit(payload);
            setResult(res);
            onSuccess();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
            setError(e.response?.data?.error || e.response?.data?.message || e.message || t("convert.errorFallback"));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTempPassword = async () => {
        if (!result?.tempPassword) return;
        try {
            await navigator.clipboard.writeText(result.tempPassword);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    const handleDoneClick = () => {
        setResult(null);
        onClose();
    };

    if (result) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={handleDoneClick}
                size="md"
                title={t("convert.successTitle")}
                footer={
                    <div className="flex justify-end">
                        <Button onClick={handleDoneClick}>{t("common.done")}</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {result.idempotent ? (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{t("convert.alreadyConverted")}</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                            <Check size={16} className="mt-0.5 shrink-0" />
                            <span>{t("convert.successMessage")}</span>
                        </div>
                    )}

                    {result.company && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm space-y-1">
                            <p className="text-xs uppercase tracking-wide text-gray-400">{t("convert.companyHeading")}</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{result.company.name}</p>
                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{result.company._id}</p>
                            {result.company.vatNumber && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t("convert.vat")} {result.company.vatNumber}</p>
                            )}
                        </div>
                    )}

                    {result.user && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm space-y-1">
                            <p className="text-xs uppercase tracking-wide text-gray-400">{t("convert.customerUserHeading")}</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{result.user.email}</p>
                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{result.user._id}</p>
                        </div>
                    )}

                    {result.tempPassword && (
                        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-yellow-700 dark:text-yellow-200 font-semibold">
                                {t("convert.tempPasswordHeading")}
                            </p>
                            <p className="text-xs text-yellow-800 dark:text-yellow-300">{t("convert.tempPasswordHelp")}</p>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    type="text"
                                    value={result.tempPassword}
                                    className="flex-1 font-mono text-sm border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-900 rounded px-2 py-1 focus:outline-none"
                                    onFocus={(e) => e.currentTarget.select()}
                                />
                                <Button
                                    size="sm"
                                    variant={copied ? "success" : "primary"}
                                    iconStart={copied ? <Check size={14} /> : <Copy size={14} />}
                                    onClick={handleCopyTempPassword}
                                >
                                    {copied ? t("common.copied") : t("common.copy")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={t("convert.title", { name: lead.name })}
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
                    <Button
                        onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                        disabled={!canSubmit}
                        loading={loading}
                        variant="success"
                    >
                        {loading ? t("convert.submitting") : t("convert.submit")}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <Field label={t("convert.fields.companyName")} required>
                    <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        invalid={!!error && !trimmedCompanyName}
                    />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("convert.fields.vatNumber")}>
                        <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                    </Field>
                    <Field label={t("convert.fields.city")}>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </Field>
                </div>

                <Field label={t("convert.fields.address")}>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t("convert.fields.phone")}>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </Field>
                    <Field label={t("convert.fields.email")}>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </Field>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                        {t("convert.customerLoginSection")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label={t("convert.fields.contactName")}>
                            <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
                        </Field>
                        <Field label={t("convert.fields.password")} optional={t("common.optional")}>
                            <Input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder={t("convert.fields.passwordPlaceholder")}
                            />
                        </Field>
                    </div>
                </div>

                <Field label={t("convert.fields.internalNote")}>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={t("convert.fields.internalNotePlaceholder")}
                    />
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
