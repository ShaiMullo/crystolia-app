import { SITE_URL, BRAND, LOGO, OG_IMAGE } from "@/i18n/site";
import type { Locale } from "@/i18n/config";

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
  products: {
    items: Array<{ title: string; description: string }>;
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
  const brand = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "@id": `${SITE_URL}/#brand`,
    name: BRAND,
    alternateName: [dict.seo.alternateName, "קריסטוליה", "שמן קריסטוליה"],
    url: SITE_URL,
    logo: logoUrl,
    description: dict.seo.description,
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

  // Two product types Crystolia sells. Descriptions come from the localized
  // dictionary; brand only — no prices or unverified claims.
  const sunflower = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/#product-sunflower-oil`,
    name: "Crystolia Sunflower Oil",
    alternateName: dict.seo.productAlt.sunflower,
    url: `${pageUrl}#products`,
    brand: { "@id": `${SITE_URL}/#brand` },
    manufacturer: { "@id": `${SITE_URL}/#organization` },
    category: "Cooking Oil",
    image: `${SITE_URL}/bottle-5l.png`,
    description: dict.products.items?.[0]?.description ?? dict.seo.description,
    size: ["0.9L", "5L"],
    audience: {
      "@type": "Audience",
      audienceType: "households, restaurants, catering businesses, food industry, retailers",
    },
  };

  const canola = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/#product-canola-oil`,
    name: "Crystolia Canola Oil",
    alternateName: dict.seo.productAlt.canola,
    url: `${pageUrl}#products`,
    brand: { "@id": `${SITE_URL}/#brand` },
    manufacturer: { "@id": `${SITE_URL}/#organization` },
    category: "Cooking Oil",
    image: `${SITE_URL}/bottle-10l.png`,
    description: dict.products.items?.[1]?.description ?? dict.seo.description,
    size: ["0.9L", "5L"],
    audience: {
      "@type": "Audience",
      audienceType: "households, restaurants, catering businesses, food industry, retailers",
    },
  };

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
