"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Lead } from '@/types';
import { useAdminI18n } from '@/i18n/I18nProvider';

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
    const [companyName, setCompanyName] = useState('');
    const [vatNumber, setVatNumber] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ConvertSubmitResult | null>(null);
    const [copied, setCopied] = useState(false);

    // Reset form whenever modal opens for a new lead
    useEffect(() => {
        if (isOpen && lead) {
            setCompanyName(lead.name || '');
            setVatNumber('');
            setAddress('');
            setCity('');
            setPhone(lead.phone || '');
            setEmail(lead.email || '');
            setUserName(lead.name || '');
            setPassword('');
            setNote('');
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
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e.response?.data?.message || e.message || t('convert.errorFallback'));
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
            // Fallback: select the value via a hidden input would be safer, but a no-op is fine
            setCopied(false);
        }
    };

    const handleDoneClick = () => {
        setResult(null);
        onClose();
    };

    // ── Success view ──────────────────────────────────────────────────────
    if (result) {
        return (
            <Modal isOpen={isOpen} onClose={handleDoneClick} title={t('convert.successTitle')}>
                <div className="space-y-4">
                    {result.idempotent ? (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                            {t('convert.alreadyConverted')}
                        </p>
                    ) : (
                        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                            {t('convert.successMessage')}
                        </p>
                    )}

                    {result.company && (
                        <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                            <p className="text-xs uppercase tracking-wide text-gray-400">{t('convert.companyHeading')}</p>
                            <p className="font-medium text-gray-900">{result.company.name}</p>
                            <p className="font-mono text-xs text-gray-500">{result.company._id}</p>
                            {result.company.vatNumber && (
                                <p className="text-xs text-gray-500">{t('convert.vat')} {result.company.vatNumber}</p>
                            )}
                        </div>
                    )}

                    {result.user && (
                        <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                            <p className="text-xs uppercase tracking-wide text-gray-400">{t('convert.customerUserHeading')}</p>
                            <p className="font-medium text-gray-900">{result.user.email}</p>
                            <p className="font-mono text-xs text-gray-500">{result.user._id}</p>
                        </div>
                    )}

                    {result.tempPassword && (
                        <div className="border border-yellow-300 bg-yellow-50 rounded p-3 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-yellow-700 font-semibold">
                                {t('convert.tempPasswordHeading')}
                            </p>
                            <p className="text-xs text-yellow-800">
                                {t('convert.tempPasswordHelp')}
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    type="text"
                                    value={result.tempPassword}
                                    className="flex-1 font-mono text-sm border border-yellow-300 bg-white rounded px-2 py-1 focus:outline-none"
                                    onFocus={(e) => e.currentTarget.select()}
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyTempPassword}
                                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded"
                                >
                                    {copied ? t('common.copied') : t('common.copy')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleDoneClick}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded"
                        >
                            {t('common.done')}
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    // ── Form view ─────────────────────────────────────────────────────────
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('convert.title', { name: lead.name })}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        {t('convert.fields.companyName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('convert.fields.vatNumber')}</label>
                        <input
                            type="text"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('convert.fields.city')}</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('convert.fields.address')}</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('convert.fields.phone')}</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('convert.fields.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                        {t('convert.customerLoginSection')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('convert.fields.contactName')}</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {t('convert.fields.password')} <span className="text-gray-400">{t('common.optional')}</span>
                            </label>
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder={t('convert.fields.passwordPlaceholder')}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('convert.fields.internalNote')}</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder={t('convert.fields.internalNotePlaceholder')}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? t('convert.submitting') : t('convert.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
