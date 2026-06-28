import type { Metadata } from "next";
import { i18n, type Locale } from "@/i18n/config";
import { BRAND, OG_IMAGE, OG_LOCALE, localeUrl } from "@/i18n/site";
import LegalPage from "@/components/LegalPage";
import { privacyContent } from "@/i18n/pages/privacy";

const SUB_PATH = "/privacy";

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

function resolveLocale(raw: string): Locale {
  return i18n.locales.includes(raw as Locale)
    ? (raw as Locale)
    : (i18n.defaultLocale as Locale);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const content = privacyContent[locale];
  const url = localeUrl(locale, SUB_PATH);

  return {
    title: { absolute: content.metaTitle },
    description: content.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: BRAND,
      title: content.metaTitle,
      description: content.metaDescription,
      url,
      locale: OG_LOCALE[locale] ?? "en_US",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: content.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
      images: [OG_IMAGE],
    },
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  return <LegalPage locale={locale} content={privacyContent[locale]} subPath={SUB_PATH} />;
}
