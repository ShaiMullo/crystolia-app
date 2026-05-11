"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/app/lib/api";
import { toast, Toaster } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BoxPrice {
    label: string;
    sku: string;
    pricePerUnit: number;
    isActive: boolean;
}

interface SettingsData {
    minimumOrderAmount: number;
    currency: string;
    boxPrices: BoxPrice[];
}

const EMPTY_BOX_PRICE: BoxPrice = {
    label: "",
    sku: "",
    pricePerUnit: 0,
    isActive: true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SettingsPage() {
    const { user } = useAuth();
    const { t } = useAdminI18n();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [minimumOrderAmount, setMinimumOrderAmount] = useState(0);
    const [currency, setCurrency] = useState("ILS");
    const [boxPrices, setBoxPrices] = useState<BoxPrice[]>([]);

    // ──────────────────────────────────────────
    // Fetch
    // ──────────────────────────────────────────

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/settings");
            const data: SettingsData = res.data.data;
            setMinimumOrderAmount(data.minimumOrderAmount ?? 0);
            setCurrency(data.currency ?? "ILS");
            setBoxPrices(data.boxPrices ?? []);
        } catch (err) {
            console.error(err);
            setError(t("settings.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (user) fetchSettings();
    }, [user, fetchSettings]);

    // ──────────────────────────────────────────
    // Box price row handlers
    // ──────────────────────────────────────────

    const handleBoxChange = (index: number, field: keyof BoxPrice, value: string | number | boolean) => {
        setBoxPrices(prev =>
            prev.map((row, i) => i === index ? { ...row, [field]: value } : row)
        );
    };

    const handleAddBox = () => {
        setBoxPrices(prev => [...prev, { ...EMPTY_BOX_PRICE }]);
    };

    const handleRemoveBox = (index: number) => {
        setBoxPrices(prev => prev.filter((_, i) => i !== index));
    };

    // ──────────────────────────────────────────
    // Save
    // ──────────────────────────────────────────

    const handleSave = async () => {
        // Basic client-side guard
        if (minimumOrderAmount < 0) {
            toast.error(t("settings.section1.minNegative"));
            return;
        }

        setSaving(true);
        try {
            await api.put("/settings", {
                minimumOrderAmount,
                currency,
                boxPrices,
            });
            toast.success(t("settings.toasts.saved"));
        } catch (err) {
            console.error(err);
            toast.error(t("settings.toasts.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    // ──────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────

    if (!user) return null;

    return (
        <div className="space-y-6">
            <Toaster />

            {/* Page header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('settings.pageTitle')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('settings.pageSubtitle')}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-5 py-2 rounded text-sm font-medium"
                >
                    {saving ? t('settings.saving') : t('settings.saveBtn')}
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                    <button onClick={fetchSettings} className="ml-3 underline text-red-600 hover:text-red-800">
                        {t('common.retry')}
                    </button>
                </div>
            )}

            {/* Loading state */}
            {loading ? (
                <div className="bg-white shadow rounded-lg p-6 text-center py-12 text-gray-500">
                    {t('settings.loading')}
                </div>
            ) : (
                <>
                    {/* ── Section 1: Order Settings ── */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.section1.title')}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('settings.section1.minOrderLabel')}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={minimumOrderAmount}
                                    onChange={e => setMinimumOrderAmount(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('settings.section1.minOrderHelp')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('settings.section1.currency')}
                                </label>
                                <select
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                                >
                                    <option value="ILS">ILS — Israeli New Shekel</option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* ── Section 2: Box Prices ── */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{t('settings.section2.title')}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{t('settings.section2.subtitle')}</p>
                            </div>
                            <button
                                onClick={handleAddBox}
                                className="text-sm text-yellow-600 hover:text-yellow-800 border border-yellow-400 px-3 py-1.5 rounded font-medium"
                            >
                                {t('settings.section2.addRow')}
                            </button>
                        </div>

                        {boxPrices.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                {t('settings.section2.empty')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('settings.section2.labelCol')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('settings.section2.skuCol')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('settings.section2.priceCol')} ({currency})</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('settings.section2.activeCol')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('settings.section2.removeCol')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {boxPrices.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={row.label}
                                                        placeholder={t('settings.section2.labelPlaceholder')}
                                                        onChange={e => handleBoxChange(i, "label", e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={row.sku}
                                                        placeholder={t('settings.section2.skuPlaceholder')}
                                                        onChange={e => handleBoxChange(i, "sku", e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={row.pricePerUnit}
                                                        onChange={e => handleBoxChange(i, "pricePerUnit", Number(e.target.value))}
                                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.isActive}
                                                        onChange={e => handleBoxChange(i, "isActive", e.target.checked)}
                                                        className="h-4 w-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleRemoveBox(i)}
                                                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                    >
                                                        {t('common.remove')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Bottom save bar */}
                    <div className="flex justify-end pb-4">
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium"
                        >
                            {saving ? t('settings.saving') : t('settings.saveBtn')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
