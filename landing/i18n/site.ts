// Central site constants used for SEO metadata, canonical URLs,
// hreflang alternates, sitemap and structured data.
import type { Locale } from "./config";

export const SITE_URL = "https://crystolia.com";
export const BRAND = "Crystolia";
export const OG_IMAGE = "/crystolia-bg.png";
export const LOGO = "/crystolia-logo.png";

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
