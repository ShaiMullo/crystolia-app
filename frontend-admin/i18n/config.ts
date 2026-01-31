export const i18n = {
  defaultLocale: "en",
  locales: ["en", "he", "ru"] as const, // או השפות שלך
};

export type Locale = (typeof i18n.locales)[number];
