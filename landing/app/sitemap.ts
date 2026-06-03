import type { MetadataRoute } from "next";
import { SITE_URL } from "@/i18n/site";
import { i18n } from "@/i18n/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const languages = Object.fromEntries(
    i18n.locales.map((l) => [l, `${SITE_URL}/${l}`])
  );

  return i18n.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "weekly",
    priority: locale === i18n.defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));
}
