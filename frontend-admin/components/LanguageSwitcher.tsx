"use client";

import React from "react";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { Locale } from "@/i18n";

interface Props {
    className?: string;
}

export default function LanguageSwitcher({ className = "" }: Props) {
    const { locale, setLocale, locales, t } = useAdminI18n();

    return (
        <label className={`inline-flex items-center gap-1 text-sm ${className}`}>
            <span className="sr-only">{t("language.label")}</span>
            <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                aria-label={t("language.label")}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-gray-700 focus:ring-yellow-500 focus:border-yellow-500"
            >
                {locales.map((l) => (
                    <option key={l} value={l}>
                        {t(`language.${l}`)}
                    </option>
                ))}
            </select>
        </label>
    );
}
