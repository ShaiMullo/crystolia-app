import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { Locale, i18n } from "@/i18n/config";
import { SITE_URL, BRAND, OG_IMAGE, OG_LOCALE, localeUrl } from "@/i18n/site";
import AlternateLinks from "@/components/AlternateLinks";
import { aboutContent } from "@/i18n/pages/about";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

function resolveLocale(rawLocale: string): Locale {
  return i18n.locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : (i18n.defaultLocale as Locale);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const content = aboutContent[locale];
  const url = localeUrl(locale, "/about");

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

export default async function AboutPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const dict = getDictionary(locale);
  const content = aboutContent[locale];
  const isRTL = locale === "he";
  const pageUrl = `${SITE_URL}/${locale}/about`;

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: content.metaTitle,
    description: content.metaDescription,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: { "@id": `${SITE_URL}/#organization` },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND, item: `${SITE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: content.title, item: pageUrl },
    ],
  };

  return (
    <>
      <AlternateLinks subPath="/about" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header dict={dict} locale={locale} />
      <main
        dir={isRTL ? "rtl" : "ltr"}
        className="bg-gradient-to-b from-[#FFF8E7] via-white to-[#FFF8E7] min-h-screen"
      >
        <article className="max-w-4xl mx-auto px-6 lg:px-12 pt-36 pb-24">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#5D4037]/70">
            <Link href={`/${locale}`} className="hover:text-[#B8860B] transition-colors">
              {dict.nav.home}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#3D2914] font-medium">{content.title}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#3D2914] mb-6">
            {content.title}
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#5D4037] mb-12">
            {content.intro}
          </p>

          {content.sections.map((section, i) => (
            <section key={i} className="mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#3D2914] mb-4">
                {section.heading}
              </h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-base md:text-lg leading-relaxed text-[#5D4037] mb-4">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/faq`}
              className="inline-block px-6 py-3 rounded-full bg-[#3D2914] text-white font-medium hover:bg-[#5D4037] transition-colors"
            >
              {dict.nav.faq}
            </Link>
            <Link
              href={`/${locale}#contact`}
              className="inline-block px-6 py-3 rounded-full bg-[#F5C542] text-[#3D2914] font-medium hover:bg-[#d4a83a] transition-colors"
            >
              {dict.nav.contact}
            </Link>
          </div>
        </article>
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
