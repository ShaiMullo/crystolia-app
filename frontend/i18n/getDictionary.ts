import "server-only";

import en from "./dictionaries/en.json";
import he from "./dictionaries/he.json";
import ru from "./dictionaries/ru.json";
import type { Locale } from "./config";
import { i18n } from "./config";

const dictionaries = {
  en,
  he,
  ru,
} as const;

export const getDictionary = async (locale: Locale) => {
  // Validate locale and fallback to default if invalid
  if (!locale || typeof locale !== "string") {
    console.warn(`[i18n] Invalid locale type: ${typeof locale}, falling back to default "${i18n.defaultLocale}"`);
    return dictionaries[i18n.defaultLocale as Locale];
  }

  const validLocale: Locale = i18n.locales.includes(locale as Locale)
    ? (locale as Locale)
    : (i18n.defaultLocale as Locale);

  // Log if locale was changed
  if (validLocale !== locale) {
    console.warn(`[i18n] Locale "${locale}" is not supported, using "${validLocale}"`);
  }

  // Return dictionary, ensuring it's never undefined
  const dict = dictionaries[validLocale];

  if (!dict) {
    // Fallback to default locale dictionary if dictionary is missing
    console.error(`[i18n] Dictionary for locale "${validLocale}" not found, falling back to "${i18n.defaultLocale}"`);
    return dictionaries[i18n.defaultLocale as Locale];
  }

  // Validation: Check if dictionary has expected structure
  if (typeof dict !== "object" || dict === null) {
    console.error(`[i18n] Dictionary for locale "${validLocale}" is not a valid object, falling back to "${i18n.defaultLocale}"`);
    return dictionaries[i18n.defaultLocale as Locale];
  }

  return dict;
};
