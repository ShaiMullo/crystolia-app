import heRaw from "./dictionaries/he.json";
import enRaw from "./dictionaries/en.json";
import ruRaw from "./dictionaries/ru.json";

export type Locale = "he" | "en" | "ru";
export type Direction = "ltr" | "rtl";

export const LOCALES: Locale[] = ["he", "en", "ru"];
export const DEFAULT_LOCALE: Locale = "he";
export const STORAGE_KEY = "crystolia.admin.locale";

// `en` is the source of truth for the key shape. Other locales are typed against
// it so missing keys surface at compile time.
export type Dictionary = typeof enRaw;

export const dictionaries: Record<Locale, Dictionary> = {
    he: heRaw as Dictionary,
    en: enRaw,
    ru: ruRaw as Dictionary,
};

export const LOCALE_DIR: Record<Locale, Direction> = {
    he: "rtl",
    en: "ltr",
    ru: "ltr",
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as string[]).includes(value);
}

/**
 * Resolve a dotted key path against a dictionary. Returns the path itself if the
 * key is missing, so the UI degrades gracefully and missing keys are obvious.
 */
export function resolvePath(dict: Dictionary, path: string): string {
    const segments = path.split(".");
    let cursor: unknown = dict;
    for (const segment of segments) {
        if (cursor && typeof cursor === "object" && segment in (cursor as Record<string, unknown>)) {
            cursor = (cursor as Record<string, unknown>)[segment];
        } else {
            return path;
        }
    }
    return typeof cursor === "string" ? cursor : path;
}

/**
 * Replace `{name}` style placeholders with the matching value from `vars`.
 * Numeric values are stringified; anything missing is left as the literal `{name}`.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        const value = vars[key];
        return value === undefined ? match : String(value);
    });
}
