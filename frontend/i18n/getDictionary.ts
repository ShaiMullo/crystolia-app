import "server-only";

import en from "./dictionaries/en.json";
import he from "./dictionaries/he.json";
import ru from "./dictionaries/ru.json";

const dictionaries: Record<string, any> = {
  en,
  he,
  ru,
};

export const getDictionary = async (locale: string) => {
  return dictionaries[locale];   // <-- לא () !
};
