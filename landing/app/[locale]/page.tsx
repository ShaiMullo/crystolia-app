import type { Metadata } from "next";
import { getDictionary } from "@/i18n/getDictionary";
import { Locale, i18n } from "@/i18n/config";
import { SITE_URL, BRAND, OG_IMAGE, OG_LOCALE } from "@/i18n/site";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Products from "@/components/Products";
import About from "@/components/About";
import Brand from "@/components/Brand";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = i18n.locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : (i18n.defaultLocale as Locale);
  const dict = getDictionary(locale);

  const title = dict.seo.title;
  const description = dict.seo.description;
  const url = `${SITE_URL}/${locale}`;

  // hreflang alternates for every locale + x-default.
  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}/${i18n.defaultLocale}`,
  };
  for (const l of i18n.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }

  return {
    title: { absolute: title },
    description,
    keywords: dict.seo.keywords,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      siteName: BRAND,
      title,
      description,
      url,
      locale: OG_LOCALE[locale] ?? "en_US",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: dict.seo.ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function LandingPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;

  const locale: Locale = i18n.locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : (i18n.defaultLocale as Locale);

  const dict = getDictionary(locale);

  return (
    <>
      <StructuredData locale={locale} dict={dict} />
      <Header dict={dict} locale={locale} />
      <main>
        <Hero dict={dict} locale={locale} />
        <Features dict={dict} locale={locale} />
        <Products dict={dict} locale={locale} />
        <About dict={dict} locale={locale} />
        <Brand dict={dict} locale={locale} />
        <Contact dict={dict} locale={locale} />
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
