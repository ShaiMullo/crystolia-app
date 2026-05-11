"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    DEFAULT_LOCALE,
    Direction,
    LOCALES,
    LOCALE_DIR,
    Locale,
    STORAGE_KEY,
    dictionaries,
    interpolate,
    isLocale,
    resolvePath,
} from "./index";

interface I18nContextValue {
    locale: Locale;
    setLocale: (next: Locale) => void;
    t: (path: string, vars?: Record<string, string | number>) => string;
    dir: Direction;
    locales: Locale[];
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    // Start with the default locale on both server and first client render to
    // avoid hydration mismatches. After mount we sync from localStorage.
    const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (isLocale(stored) && stored !== locale) {
                setLocaleState(stored);
            }
        } catch {
            // localStorage may be unavailable (private mode, etc.) — fall through
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply <html lang> and <html dir> whenever locale changes.
    useEffect(() => {
        if (typeof document === "undefined") return;
        document.documentElement.lang = locale;
        document.documentElement.dir = LOCALE_DIR[locale];
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Best-effort persistence — ignore if storage is unavailable.
        }
    }, []);

    const t = useCallback<I18nContextValue["t"]>(
        (path, vars) => interpolate(resolvePath(dictionaries[locale], path), vars),
        [locale],
    );

    const value = useMemo<I18nContextValue>(
        () => ({ locale, setLocale, t, dir: LOCALE_DIR[locale], locales: LOCALES }),
        [locale, setLocale, t],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useAdminI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useAdminI18n must be used within an I18nProvider");
    }
    return ctx;
}
