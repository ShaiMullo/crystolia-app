// Country display names for the registration screens. Kept in sync manually
// with backend/src/utils/countries.ts (no shared package between workspaces).

import type { Locale } from "@/i18n";

const COUNTRY_NAMES: Record<string, { he: string; en: string; ru: string }> = {
    IL: { he: "ישראל", en: "Israel", ru: "Израиль" },
    AM: { he: "ארמניה", en: "Armenia", ru: "Армения" },
    AU: { he: "אוסטרליה", en: "Australia", ru: "Австралия" },
    AT: { he: "אוסטריה", en: "Austria", ru: "Австрия" },
    AZ: { he: "אזרבייג׳ן", en: "Azerbaijan", ru: "Азербайджан" },
    BY: { he: "בלארוס", en: "Belarus", ru: "Беларусь" },
    BE: { he: "בלגיה", en: "Belgium", ru: "Бельгия" },
    BG: { he: "בולגריה", en: "Bulgaria", ru: "Болгария" },
    CA: { he: "קנדה", en: "Canada", ru: "Канада" },
    CY: { he: "קפריסין", en: "Cyprus", ru: "Кипр" },
    CZ: { he: "צ׳כיה", en: "Czechia", ru: "Чехия" },
    FR: { he: "צרפת", en: "France", ru: "Франция" },
    GE: { he: "גאורגיה", en: "Georgia", ru: "Грузия" },
    DE: { he: "גרמניה", en: "Germany", ru: "Германия" },
    GR: { he: "יוון", en: "Greece", ru: "Греция" },
    IT: { he: "איטליה", en: "Italy", ru: "Италия" },
    KZ: { he: "קזחסטן", en: "Kazakhstan", ru: "Казахстан" },
    MD: { he: "מולדובה", en: "Moldova", ru: "Молдова" },
    NL: { he: "הולנד", en: "Netherlands", ru: "Нидерланды" },
    PL: { he: "פולין", en: "Poland", ru: "Польша" },
    RO: { he: "רומניה", en: "Romania", ru: "Румыния" },
    RU: { he: "רוסיה", en: "Russia", ru: "Россия" },
    ES: { he: "ספרד", en: "Spain", ru: "Испания" },
    CH: { he: "שווייץ", en: "Switzerland", ru: "Швейцария" },
    TR: { he: "טורקיה", en: "Turkey", ru: "Турция" },
    UA: { he: "אוקראינה", en: "Ukraine", ru: "Украина" },
    AE: { he: "איחוד האמירויות", en: "United Arab Emirates", ru: "ОАЭ" },
    GB: { he: "בריטניה", en: "United Kingdom", ru: "Великобритания" },
    US: { he: "ארצות הברית", en: "United States", ru: "США" },
    UZ: { he: "אוזבקיסטן", en: "Uzbekistan", ru: "Узбекистан" },
};

/** Localized country name; unknown codes render as-is. */
export function countryName(code: string | undefined, locale: Locale): string {
    if (!code) return "—";
    return COUNTRY_NAMES[code]?.[locale] ?? code;
}
