import Link from "next/link";
import type { Locale } from "../i18n/config";
import { getDictionary } from "../i18n/getDictionary";
import { SITE_URL, BRAND } from "../i18n/site";
import type { LegalPageContent } from "../i18n/pages/legalTypes";
import AlternateLinks from "./AlternateLinks";
import Header from "./Header";
import Footer from "./Footer";

interface LegalPageProps {
  locale: Locale;
  content: LegalPageContent;
  /** Path after the locale segment, e.g. "/privacy". */
  subPath: string;
}

// Shared renderer for the legal pages (privacy, cookies, terms). Mirrors the
// about/faq page layout for visual consistency and is static-export friendly.
export default function LegalPage({ locale, content, subPath }: LegalPageProps) {
  const dict = getDictionary(locale);
  const isRTL = locale === "he";
  const pageUrl = `${SITE_URL}/${locale}${subPath}`;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: content.metaTitle,
    description: content.metaDescription,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    dateModified: content.lastUpdated,
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
      <AlternateLinks subPath={subPath} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header dict={dict} locale={locale} />
      <main
        id="main-content"
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

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#3D2914] mb-3">
            {content.title}
          </h1>
          <p className="text-sm text-[#5D4037]/70 mb-10">
            {dict.legal.lastUpdated}: {content.lastUpdated}
          </p>
          <p className="text-lg md:text-xl leading-relaxed text-[#5D4037] mb-12">
            {content.intro}
          </p>

          {content.sections.map((section, i) => (
            <section key={i} className="mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#3D2914] mb-4">
                {section.heading}
              </h2>
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="text-base md:text-lg leading-relaxed text-[#5D4037] mb-4"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}

          <div className="mt-14">
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
