import type { MetadataRoute } from "next";
import { localeUrl, hreflangAlternates } from "@/i18n/site";
import { i18n } from "@/i18n/config";
import { LOCALE_ROUTES as routes } from "@/i18n/routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.flatMap((route) => {
    // Per-domain hreflang (en→.com, he→.co.il, ru→.ru, x-default→.com) — matches <head>.
    const languages = hreflangAlternates(route);

    return i18n.locales.map((locale) => ({
      url: localeUrl(locale, route),
      lastModified,
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority:
        route === ""
          ? locale === i18n.defaultLocale
            ? 1
            : 0.8
          : locale === i18n.defaultLocale
            ? 0.7
            : 0.6,
      alternates: { languages },
    }));
  });
}
