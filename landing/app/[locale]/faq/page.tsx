import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/getDictionary";
import { Locale, i18n } from "@/i18n/config";
import { SITE_URL, BRAND, OG_IMAGE, OG_LOCALE } from "@/i18n/site";
import { faqContent } from "@/i18n/pages/faq";

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
  const content = faqContent[locale];
  const url = `${SITE_URL}/${locale}/faq`;

  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}/${i18n.defaultLocale}/faq`,
  };
  for (const l of i18n.locales) {
    languages[l] = `${SITE_URL}/${l}/faq`;
  }

  return {
    title: { absolute: content.metaTitle },
    description: content.metaDescription,
    alternates: { canonical: url, languages },
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

export default async function FaqPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const dict = getDictionary(locale);
  const content = faqContent[locale];
  const isRTL = locale === "he";
  const pageUrl = `${SITE_URL}/${locale}/faq`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faqpage`,
    url: pageUrl,
    name: content.metaTitle,
    description: content.metaDescription,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntity: content.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
        <div className="max-w-4xl mx-auto px-6 lg:px-12 pt-36 pb-24">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#5D4037]/70">
            <Link href={`/${locale}`} className="hover:text-[#B8860B] transition-colors">
              {dict.nav.home}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#3D2914] font-medium">{content.title}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#3D2914] mb-4">
            {content.title}
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#5D4037] mb-12">
            {content.subtitle}
          </p>

          <div className="space-y-4">
            {content.items.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-[#F5C542]/30 bg-white/80 backdrop-blur-sm shadow-sm open:shadow-md transition-shadow"
              >
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4">
                  <h2 className="text-base md:text-lg font-semibold text-[#3D2914]">
                    {item.q}
                  </h2>
                  <span
                    aria-hidden
                    className="shrink-0 text-[#B8860B] text-xl transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-base leading-relaxed text-[#5D4037]">{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/about`}
              className="inline-block px-6 py-3 rounded-full bg-[#3D2914] text-white font-medium hover:bg-[#5D4037] transition-colors"
            >
              {dict.nav.about}
            </Link>
            <Link
              href={`/${locale}#contact`}
              className="inline-block px-6 py-3 rounded-full bg-[#F5C542] text-[#3D2914] font-medium hover:bg-[#d4a83a] transition-colors"
            >
              {dict.nav.contact}
            </Link>
          </div>
        </div>
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
