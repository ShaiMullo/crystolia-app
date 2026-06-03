import { SITE_URL, BRAND, LOGO, OG_IMAGE } from "@/i18n/site";
import type { Locale } from "@/i18n/config";

interface Dict {
  seo: {
    description: string;
    keywords: string;
    alternateName: string;
    productAlt: { sunflower: string; canola: string };
  };
  products: {
    items: Array<{ title: string; description: string }>;
  };
  about: { content: string[] };
}

/**
 * Emits JSON-LD structured data so Google and AI engines can understand that
 * Crystolia is a food-oil brand selling canola oil and sunflower oil.
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
    url: SITE_URL,
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  // Two product types Crystolia sells. Descriptions come from the localized
  // dictionary; brand only — no prices or unverified claims.
  const sunflower = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Crystolia Sunflower Oil",
    alternateName: dict.seo.productAlt.sunflower,
    brand: { "@type": "Brand", name: BRAND, alternateName: dict.seo.alternateName },
    category: "Cooking Oil",
    image: `${SITE_URL}/bottle-5l.png`,
    description: dict.products.items?.[0]?.description ?? dict.seo.description,
  };

  const canola = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Crystolia Canola Oil",
    alternateName: dict.seo.productAlt.canola,
    brand: { "@type": "Brand", name: BRAND, alternateName: dict.seo.alternateName },
    category: "Cooking Oil",
    image: `${SITE_URL}/bottle-10l.png`,
    description: dict.products.items?.[1]?.description ?? dict.seo.description,
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
        name: "Products",
        item: `${pageUrl}#products`,
      },
    ],
  };

  const blocks = [organization, website, sunflower, canola, breadcrumb];

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
