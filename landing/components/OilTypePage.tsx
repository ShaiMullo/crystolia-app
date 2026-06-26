import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { i18n, type Locale } from "@/i18n/config";
import { SITE_URL, BRAND, OG_LOCALE, whatsappNumber, localeUrl } from "@/i18n/site";
import AlternateLinks from "@/components/AlternateLinks";
import { getDictionary } from "@/i18n/getDictionary";
import { getProductsByOilType, type OilType } from "@/i18n/products";
import { oilPagesContent } from "@/i18n/pages/oil-pages";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function resolveLocale(rawLocale: string): Locale {
  return i18n.locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : (i18n.defaultLocale as Locale);
}

// Shared generateMetadata implementation for both oil-type routes.
export function buildOilPageMetadata(oilType: OilType, locale: Locale): Metadata {
  const content = oilPagesContent[oilType][locale];
  const products = getProductsByOilType(oilType);
  const url = localeUrl(locale, `/${oilType}-oil`);
  const ogImage = products[0]?.image ?? "/crystolia-bg.png";

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
      images: [{ url: ogImage, alt: content.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
      images: [ogImage],
    },
  };
}

// Shared layout for the dedicated product-line pages
// (/{locale}/canola-oil and /{locale}/sunflower-oil).
export default function OilTypePage({
  locale,
  oilType,
}: {
  locale: Locale;
  oilType: OilType;
}) {
  const dict = getDictionary(locale);
  const content = oilPagesContent[oilType][locale];
  const products = getProductsByOilType(oilType);
  const isRTL = locale === "he";
  const pageUrl = `${SITE_URL}/${locale}/${oilType}-oil`;

  const whatsappHref = `https://wa.me/${whatsappNumber(locale)}?text=${encodeURIComponent(
    dict.products.whatsappMessage
  )}`;

  // Every verified lifestyle/cooking photo of this product line.
  const gallery = products.flatMap((p) => p.gallery);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/#product-${oilType}-oil`,
    name: `Crystolia ${oilType === "canola" ? "Canola" : "Sunflower"} Oil`,
    alternateName: dict.seo.productAlt[oilType],
    url: pageUrl,
    brand: { "@id": `${SITE_URL}/#brand` },
    manufacturer: { "@id": `${SITE_URL}/#organization` },
    category: "Cooking Oil",
    image: [...new Set(products.map((p) => `${SITE_URL}${p.image}`))],
    description: content.metaDescription,
    size: products.map((p) => p.size),
    audience: {
      "@type": "Audience",
      audienceType:
        "households, restaurants, catering businesses, food industry, retailers",
    },
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
      <AlternateLinks subPath={`/${oilType}-oil`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
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
        <article className="max-w-5xl mx-auto px-6 lg:px-12 pt-36 pb-24">
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

          {/* Product cards — real photos, real sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl shadow-lg border-2 border-[#F5C542]/10 overflow-hidden flex flex-col"
              >
                {/* Full packshot, never cropped (object-contain) */}
                <div className="relative w-full h-[360px] bg-gradient-to-br from-[#FFFDF5] to-[#FFF8E7]">
                  <div className="absolute inset-6">
                    <Image
                      src={product.image}
                      alt={product.alt[locale]}
                      fill
                      className="object-contain object-center"
                      sizes="(max-width: 640px) 100vw, 480px"
                    />
                  </div>
                  <div
                    className={`absolute top-4 ${
                      isRTL ? "left-4" : "right-4"
                    } px-3 py-1 bg-[#3D2914]/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-md`}
                  >
                    {product.size}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-[#3D2914] mb-2">
                    {product.name[locale]}
                  </h2>
                  <p className="text-sm text-gray-600 font-light leading-relaxed">
                    {product.description[locale]}
                  </p>
                </div>
              </div>
            ))}
          </div>

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

          {/* Lifestyle gallery — verified photos of this product line only */}
          {gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-14">
              {gallery.map((src) => (
                <div
                  key={src}
                  className="relative h-[280px] rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-[#FFFDF5] to-[#FFF8E7]"
                >
                  <div className="absolute inset-3">
                    <Image
                      src={src}
                      alt={dict.seo.productAlt[oilType]}
                      fill
                      className="object-contain object-center"
                      sizes="(max-width: 640px) 50vw, 320px"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-14 flex flex-wrap gap-4">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-full bg-[#25D366] text-white font-medium hover:bg-[#128C7E] transition-colors"
            >
              {content.whatsappCta}
            </a>
            <Link
              href={`/${locale}#products`}
              className="inline-block px-6 py-3 rounded-full bg-[#F5C542] text-[#3D2914] font-medium hover:bg-[#d4a83a] transition-colors"
            >
              {dict.nav.products}
            </Link>
          </div>
        </article>
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
