// Curated ISO-3166 alpha-2 list accepted by the business registration.
// Kept in sync manually with backend/src/utils/countries.ts (no shared
// package exists between the workspaces).

export type CountryCode =
    | "IL" | "RU" | "US" | "UA" | "GE" | "KZ" | "AZ" | "UZ" | "BY" | "MD"
    | "DE" | "FR" | "GB" | "IT" | "ES" | "NL" | "BE" | "AT" | "CH" | "PL"
    | "CZ" | "RO" | "BG" | "GR" | "CY" | "TR" | "AE" | "CA" | "AU" | "AM";

export interface CountryOption {
    code: CountryCode;
    he: string;
    en: string;
    ru: string;
}

// Israel first (primary market), the rest alphabetical by English name.
export const COUNTRIES: CountryOption[] = [
    { code: "IL", he: "ישראל", en: "Israel", ru: "Израиль" },
    { code: "AM", he: "ארמניה", en: "Armenia", ru: "Армения" },
    { code: "AU", he: "אוסטרליה", en: "Australia", ru: "Австралия" },
    { code: "AT", he: "אוסטריה", en: "Austria", ru: "Австрия" },
    { code: "AZ", he: "אזרבייג׳ן", en: "Azerbaijan", ru: "Азербайджан" },
    { code: "BY", he: "בלארוס", en: "Belarus", ru: "Беларусь" },
    { code: "BE", he: "בלגיה", en: "Belgium", ru: "Бельгия" },
    { code: "BG", he: "בולגריה", en: "Bulgaria", ru: "Болгария" },
    { code: "CA", he: "קנדה", en: "Canada", ru: "Канада" },
    { code: "CY", he: "קפריסין", en: "Cyprus", ru: "Кипр" },
    { code: "CZ", he: "צ׳כיה", en: "Czechia", ru: "Чехия" },
    { code: "FR", he: "צרפת", en: "France", ru: "Франция" },
    { code: "GE", he: "גאורגיה", en: "Georgia", ru: "Грузия" },
    { code: "DE", he: "גרמניה", en: "Germany", ru: "Германия" },
    { code: "GR", he: "יוון", en: "Greece", ru: "Греция" },
    { code: "IT", he: "איטליה", en: "Italy", ru: "Италия" },
    { code: "KZ", he: "קזחסטן", en: "Kazakhstan", ru: "Казахстан" },
    { code: "MD", he: "מולדובה", en: "Moldova", ru: "Молдова" },
    { code: "NL", he: "הולנד", en: "Netherlands", ru: "Нидерланды" },
    { code: "PL", he: "פולין", en: "Poland", ru: "Польша" },
    { code: "RO", he: "רומניה", en: "Romania", ru: "Румыния" },
    { code: "RU", he: "רוסיה", en: "Russia", ru: "Россия" },
    { code: "ES", he: "ספרד", en: "Spain", ru: "Испания" },
    { code: "CH", he: "שווייץ", en: "Switzerland", ru: "Швейцария" },
    { code: "TR", he: "טורקיה", en: "Turkey", ru: "Турция" },
    { code: "UA", he: "אוקראינה", en: "Ukraine", ru: "Украина" },
    { code: "AE", he: "איחוד האמירויות", en: "United Arab Emirates", ru: "ОАЭ" },
    { code: "GB", he: "בריטניה", en: "United Kingdom", ru: "Великобритания" },
    { code: "US", he: "ארצות הברית", en: "United States", ru: "США" },
    { code: "UZ", he: "אוזבקיסטן", en: "Uzbekistan", ru: "Узбекистан" },
];

export function isValidCompanyNumber(country: string, value: string): boolean {
    const trimmed = value.trim();
    if (country === "IL") return /^\d{8,9}$/.test(trimmed);
    return /^[A-Za-z0-9 .\-\/]{4,32}$/.test(trimmed);
}
