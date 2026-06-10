import type { Metadata } from "next";
import { SITE_URL } from "@/i18n/site";
import { i18n } from "@/i18n/config";
import RootRedirect from "@/components/RootRedirect";

// The root "/" is a language gateway: it client-redirects visitors to
// their locale, and gives crawlers a canonical URL, hreflang alternates
// and static links to every language version.
export const metadata: Metadata = {
  title: "Crystolia | Quality Canola and Sunflower Cooking Oils",
  description:
    "Crystolia (קריסטוליה) is a food oil brand: quality canola oil and sunflower oil for households, restaurants, catering and the food industry. Available in Hebrew, English and Russian.",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "x-default": SITE_URL,
      ...Object.fromEntries(i18n.locales.map((l) => [l, `${SITE_URL}/${l}`])),
    },
  },
};

export default function RootPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <RootRedirect />
      <h1>Crystolia — Quality Canola &amp; Sunflower Cooking Oils</h1>
      <p>
        Crystolia is a food oil brand: canola oil and sunflower oil for
        households, restaurants, catering and the food industry.
      </p>
      <ul>
        <li>
          <a href="/en">English — Crystolia canola &amp; sunflower oils</a>
        </li>
        <li>
          <a href="/he">עברית — שמן קריסטוליה: שמן קנולה ושמן חמניות</a>
        </li>
        <li>
          <a href="/ru">Русский — масло Crystolia: рапсовое и подсолнечное</a>
        </li>
      </ul>
    </main>
  );
}
