// Central site constants used for SEO metadata, canonical URLs,
// hreflang alternates, sitemap and structured data.
import { i18n, type Locale } from "./config";
import { localeHost } from "./manifest";

// Global site origin = the canonical host of the default (x-default) locale.
// Sourced from the platform manifest; the choice of default locale stays in
// i18n/config.ts. (en → https://crystolia.com)
export const SITE_URL = localeHost(i18n.defaultLocale as Locale);
export const BRAND = "Crystolia";
export const OG_IMAGE = "/crystolia-bg.png";
export const LOGO = "/crystolia-logo.png";

// ── Per-locale canonical domains (apex, no www) ──────────────────────────────
// Each locale is the canonical owner of its own domain, sourced from the
// platform manifest (en → https://crystolia.com, he → https://crystolia.co.il,
// ru → https://crystolia.ru). Used for <link rel="canonical"> and hreflang
// alternates so each language maps to its matching domain. x-default points at
// the global English (.com) home.
export const LOCALE_SITE_URL: Record<Locale, string> = Object.fromEntries(
  i18n.locales.map((locale) => [locale, localeHost(locale)]),
) as Record<Locale, string>;

/** Canonical apex origin for a locale (no trailing slash, no www). */
export function localeOrigin(locale: Locale): string {
  return LOCALE_SITE_URL[locale] ?? SITE_URL;
}

/**
 * Canonical URL for a locale page.
 * - Homepage (empty `subPath`) → the bare apex domain for that locale.
 * - Sub-pages keep the /{locale}/<subPath> structure the static export emits
 *   (e.g. localeUrl("he", "/faq") → https://crystolia.co.il/he/faq).
 * `subPath` must start with "/" or be "".
 */
export function localeUrl(locale: Locale, subPath: string = ""): string {
  const origin = localeOrigin(locale);
  return subPath ? `${origin}/${locale}${subPath}` : origin;
}

/**
 * hreflang `alternates.languages` map for a sub-path: one entry per locale
 * (each on its own domain) plus `x-default` → the English (.com) version.
 */
export function hreflangAlternates(subPath: string = ""): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": localeUrl(i18n.defaultLocale as Locale, subPath),
  };
  for (const l of i18n.locales) {
    languages[l] = localeUrl(l, subPath);
  }
  return languages;
}

// Open Graph locale codes per app locale.
export const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  he: "he_IL",
  ru: "ru_RU",
};

// Official social/business profiles for the Crystolia brand.
// These feed the `sameAs` property in JSON-LD (Organization + Brand),
// which is how Google, Bing and AI engines link the website to the
// brand's external presence (Knowledge Panel / entity resolution).
//
// Add the real profile URLs here as soon as they exist — nothing else
// needs to change; StructuredData picks them up automatically.
// Examples:
//   "https://www.facebook.com/crystolia",
//   "https://www.instagram.com/crystolia",
//   "https://www.linkedin.com/company/crystolia",
//   "https://maps.google.com/?cid=<google-business-profile-id>",
export const SOCIAL_PROFILES: string[] = [];

// WhatsApp business number per locale (digits only — no "+", as wa.me expects).
// Hebrew and English route to the Israeli line; Russian routes to the Russian line.
// Single source of truth for every WhatsApp CTA and the contact schema.
export const WHATSAPP_NUMBERS: Record<Locale, string> = {
  he: "972544936067",
  en: "972544936067",
  ru: "79253031442",
};

/** WhatsApp number (digits, no "+") for a locale; falls back to the IL line. */
export function whatsappNumber(locale: Locale): string {
  return WHATSAPP_NUMBERS[locale] ?? WHATSAPP_NUMBERS.he;
}
