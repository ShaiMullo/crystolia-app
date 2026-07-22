// ===============================================
// 🌍 Supported Registration Countries
// ===============================================
// Curated ISO-3166 alpha-2 list accepted by the public business registration.
// Kept in sync manually with frontend-client/app/lib/countries.ts (no shared
// package exists between the workspaces).

export const SUPPORTED_COUNTRY_CODES = [
    'IL', 'RU', 'US', 'UA', 'GE', 'KZ', 'AZ', 'UZ', 'BY', 'MD',
    'DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL',
    'CZ', 'RO', 'BG', 'GR', 'CY', 'TR', 'AE', 'CA', 'AU', 'AM',
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number];

const CODE_SET: ReadonlySet<string> = new Set(SUPPORTED_COUNTRY_CODES);

export function isSupportedCountry(code: string): code is CountryCode {
    return CODE_SET.has(code);
}

// Hebrew names are used for the admin SMS notification.
const COUNTRY_NAMES_HE: Record<CountryCode, string> = {
    IL: 'ישראל', RU: 'רוסיה', US: 'ארצות הברית', UA: 'אוקראינה', GE: 'גאורגיה',
    KZ: 'קזחסטן', AZ: 'אזרבייג׳ן', UZ: 'אוזבקיסטן', BY: 'בלארוס', MD: 'מולדובה',
    DE: 'גרמניה', FR: 'צרפת', GB: 'בריטניה', IT: 'איטליה', ES: 'ספרד',
    NL: 'הולנד', BE: 'בלגיה', AT: 'אוסטריה', CH: 'שווייץ', PL: 'פולין',
    CZ: 'צ׳כיה', RO: 'רומניה', BG: 'בולגריה', GR: 'יוון', CY: 'קפריסין',
    TR: 'טורקיה', AE: 'איחוד האמירויות', CA: 'קנדה', AU: 'אוסטרליה', AM: 'ארמניה',
};

export function countryNameHe(code: string): string {
    return isSupportedCountry(code) ? COUNTRY_NAMES_HE[code] : code;
}

/**
 * Company-number validation by country: Israel expects a 8-9 digit ח.פ. /
 * עוסק מורשה; everywhere else a permissive VAT / Tax ID shape is accepted
 * (exact formats vary too much per country to encode here).
 */
export function isValidCompanyNumber(country: string, value: string): boolean {
    const trimmed = value.trim();
    if (country === 'IL') {
        return /^\d{8,9}$/.test(trimmed);
    }
    return /^[A-Za-z0-9 .\-\/]{4,32}$/.test(trimmed);
}
