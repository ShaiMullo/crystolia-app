// Locale-aware formatting helpers used across the admin app.

import type { Locale } from "@/i18n";

const LOCALE_BCP47: Record<Locale, string> = {
    he: "he-IL",
    en: "en-US",
    ru: "ru-RU",
};

const CURRENCY_SYMBOL: Record<string, string> = {
    ILS: "₪",
    USD: "$",
    EUR: "€",
};

export function formatCurrency(amount: number, currency = "ILS", locale: Locale = "he"): string {
    try {
        return new Intl.NumberFormat(LOCALE_BCP47[locale], {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        const symbol = CURRENCY_SYMBOL[currency] ?? currency;
        return `${symbol}${amount.toLocaleString()}`;
    }
}

export function formatNumber(value: number, locale: Locale = "he"): string {
    return new Intl.NumberFormat(LOCALE_BCP47[locale]).format(value);
}

export function formatDate(value: string | Date | undefined | null, locale: Locale = "he"): string {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(date);
}

export function formatDateTime(value: string | Date | undefined | null, locale: Locale = "he"): string {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function shortId(id: string | undefined | null, take = 6): string {
    if (!id) return "—";
    return `#${id.slice(-take).toUpperCase()}`;
}
