import en from "./dictionaries/en.json";
import he from "./dictionaries/he.json";
import ru from "./dictionaries/ru.json";
import type { Locale } from "./config";
import { i18n } from "./config";

const dictionaries = { en, he, ru } as const;

export const getDictionary = (locale: Locale) => {
  const validLocale: Locale = i18n.locales.includes(locale) ? locale : (i18n.defaultLocale as Locale);
  return dictionaries[validLocale];
};
