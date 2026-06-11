import { SITE_URL, BRAND, LOGO, OG_IMAGE, SOCIAL_PROFILES } from "@/i18n/site";
import type { Locale } from "@/i18n/config";
import { getProductsByOilType, type OilType } from "@/i18n/products";

interface Dict {
  seo: {
    description: string;
    keywords: string;
    alternateName: string;
    productAlt: { sunflower: string; canola: string };
  };
  nav: {
    products: string;
  };
  about: { content: string[] };
}

/**
 * Emits JSON-LD structured data so Google, Bing and AI engines (ChatGPT,
 * Gemini, Claude, Perplexity) can understand that Crystolia is a food-oil
 * brand selling canola oil and sunflower oil, in Hebrew, English and Russian,
 * serving restaurants, catering, the food industry and private customers.
 * No invented prices, certifications or claims are included.
 */
export default function StructuredData({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dict;
}) {
  const logoUrl = `${SITE_URL}${LOGO}`;
  const imageUrl = `${SITE_URL}${OG_IMAGE}`;
  const pageUrl = `${SITE_URL}/${locale}`;

  // Standalone Brand entity — referenced by Organization and both Products,
  // so search/AI engines resolve "Crystolia" / "קריסטוליה" to one entity.
  // sameAs links the brand entity to its official external profiles
  // (social networks, Google Business Profile, etc.) — only emitted
  // when profiles actually exist in i18n/site.ts.
  const sameAs = SOCIAL_PROFILES.length > 0 ? { sameAs: SOCIAL_PROFILES } : {};

  const brand = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "@id": `${SITE_URL}/#brand`,
    name: BRAND,
    alternateName: [dict.seo.alternateName, "קריסטוליה", "שמן קריסטוליה"],
    url: SITE_URL,
    logo: logoUrl,
    description: dict.seo.description,
    ...sameAs,
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND,
    alternateName: dict.seo.alternateName,
    url: SITE_URL,
    logo: logoUrl,
    image: imageUrl,
    description: dict.seo.description,
    keywords: dict.seo.keywords,
    brand: { "@id": `${SITE_URL}/#brand` },
    knowsLanguage: ["he", "en", "ru"],
    knowsAbout: [
      "canola oil",
      "sunflower oil",
      "cooking oil",
      "cooking oil supply for restaurants",
      "cooking oil supply for catering",
      "food industry oil supply",
    ],
    areaServed: { "@type": "Country", name: "Israel" },
    ...sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+972546970555",
      contactType: "sales",
      availableLanguage: ["he", "en", "ru"],
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND,
    alternateName: dict.seo.alternateName,
    description: dict.seo.description,
    url: SITE_URL,
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  // Two product lines Crystolia sells, built from the real product catalog
  // (i18n/products.ts): real photos, real sizes (0.9L / 5L) — no prices,
  // ratings or unverified claims.
  const productBlock = (oilType: OilType) => {
    const items = getProductsByOilType(oilType);
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${SITE_URL}/#product-${oilType}-oil`,
      name: `Crystolia ${oilType === "canola" ? "Canola" : "Sunflower"} Oil`,
      alternateName: dict.seo.productAlt[oilType],
      url: `${SITE_URL}/${locale}/${oilType}-oil`,
      brand: { "@id": `${SITE_URL}/#brand` },
      manufacturer: { "@id": `${SITE_URL}/#organization` },
      category: "Cooking Oil",
      image: [...new Set(items.map((p) => `${SITE_URL}${p.image}`))],
      description: items[0]?.description[locale] ?? dict.seo.description,
      size: items.map((p) => p.size),
      audience: {
        "@type": "Audience",
        audienceType: "households, restaurants, catering businesses, food industry, retailers",
      },
    };
  };

  const sunflower = productBlock("sunflower");
  const canola = productBlock("canola");

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: BRAND,
        item: pageUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: dict.nav.products,
        item: `${pageUrl}#products`,
      },
    ],
  };

  const blocks = [brand, organization, website, sunflower, canola, breadcrumb];

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
