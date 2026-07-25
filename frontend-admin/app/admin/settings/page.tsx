"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import {
    Button,
    Card,
    CardTitle,
    EmptyState,
    Field,
    Input,
    LoadingState,
    PageHeader,
    Select,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";

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

const EMPTY_BOX_PRICE: BoxPrice = { label: "", sku: "", pricePerUnit: 0, isActive: true };

export default function SettingsPage() {
    const { user } = useAuth();
    const { t } = useAdminI18n();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [minimumOrderAmount, setMinimumOrderAmount] = useState(0);
    const [currency, setCurrency] = useState("ILS");
    const [boxPrices, setBoxPrices] = useState<BoxPrice[]>([]);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/v1/settings");
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

    const handleBoxChange = (index: number, field: keyof BoxPrice, value: string | number | boolean) => {
        setBoxPrices((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };
    const handleAddBox = () => setBoxPrices((prev) => [...prev, { ...EMPTY_BOX_PRICE }]);
    const handleRemoveBox = (index: number) => setBoxPrices((prev) => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (minimumOrderAmount < 0) {
            toast.error(t("settings.section1.minNegative"));
            return;
        }
        setSaving(true);
        try {
            await api.put("/v1/settings", { minimumOrderAmount, currency, boxPrices });
            toast.success(t("settings.toasts.saved"));
        } catch (err) {
            console.error(err);
            toast.error(t("settings.toasts.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("settings.pageTitle")}
                description={t("settings.pageSubtitle")}
                actions={
                    <Button onClick={handleSave} loading={saving} disabled={loading} iconStart={<Save size={14} />}>
                        {saving ? t("settings.saving") : t("settings.saveBtn")}
                    </Button>
                }
            />

            {error && (
                <Card padded className="border-red-200 bg-red-50/80 dark:bg-red-900/10 dark:border-red-700/30">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5 text-red-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                            <button onClick={fetchSettings} className="mt-1 text-sm font-medium text-red-700 hover:text-red-800 underline">
                                {t("common.retry")}
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {loading ? (
                <Card><LoadingState label={t("settings.loading")} /></Card>
            ) : (
                <>
                    <Card>
                        <CardTitle>{t("settings.section1.title")}</CardTitle>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label={t("settings.section1.minOrderLabel")} hint={t("settings.section1.minOrderHelp")}>
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={minimumOrderAmount}
                                    onChange={(e) => setMinimumOrderAmount(Number(e.target.value))}
                                />
                            </Field>

                            <Field label={t("settings.section1.currency")}>
                                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                    <option value="ILS">ILS — Israeli New Shekel</option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                </Select>
                            </Field>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <CardTitle>{t("settings.section2.title")}</CardTitle>
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("settings.section2.subtitle")}</p>
                            </div>
                            <Button variant="outline" size="sm" iconStart={<Plus size={14} />} onClick={handleAddBox}>
                                {t("settings.section2.addRow")}
                            </Button>
                        </div>

                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-700/30 dark:bg-amber-900/10">
                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">{t("settings.section2.legacyNotice")}</p>
                        </div>

                        <div className="mt-4">
                            {boxPrices.length === 0 ? (
                                <EmptyState title={t("settings.section2.empty")} />
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH>{t("settings.section2.labelCol")}</TH>
                                                <TH>{t("settings.section2.skuCol")}</TH>
                                                <TH>{t("settings.section2.priceCol")} ({currency})</TH>
                                                <TH align="center">{t("settings.section2.activeCol")}</TH>
                                                <TH align="end">{t("settings.section2.removeCol")}</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {boxPrices.map((row, i) => (
                                                <TR key={i}>
                                                    <TD>
                                                        <Input
                                                            value={row.label}
                                                            placeholder={t("settings.section2.labelPlaceholder")}
                                                            onChange={(e) => handleBoxChange(i, "label", e.target.value)}
                                                        />
                                                    </TD>
                                                    <TD>
                                                        <Input
                                                            value={row.sku}
                                                            placeholder={t("settings.section2.skuPlaceholder")}
                                                            onChange={(e) => handleBoxChange(i, "sku", e.target.value)}
                                                        />
                                                    </TD>
                                                    <TD>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            value={row.pricePerUnit}
                                                            onChange={(e) => handleBoxChange(i, "pricePerUnit", Number(e.target.value))}
                                                        />
                                                    </TD>
                                                    <TD align="center">
                                                        <input
                                                            type="checkbox"
                                                            checked={row.isActive}
                                                            onChange={(e) => handleBoxChange(i, "isActive", e.target.checked)}
                                                            className="h-4 w-4 rounded text-yellow-500 border-gray-300 focus:ring-yellow-500 dark:border-gray-700 dark:bg-gray-900"
                                                        />
                                                    </TD>
                                                    <TD align="end">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            iconStart={<Trash2 size={14} />}
                                                            onClick={() => handleRemoveBox(i)}
                                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            {t("common.remove")}
                                                        </Button>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} loading={saving} disabled={loading} iconStart={<Save size={14} />}>
                            {saving ? t("settings.saving") : t("settings.saveBtn")}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
