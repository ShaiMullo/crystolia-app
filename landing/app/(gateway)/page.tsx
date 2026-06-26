import type { Metadata } from "next";
import { localeOrigin } from "@/i18n/site";
import { i18n, type Locale } from "@/i18n/config";
import RootRedirect from "@/components/RootRedirect";
import AlternateLinks from "@/components/AlternateLinks";

// The root "/" is a language gateway: it client-redirects visitors to
// their locale, and gives crawlers a canonical URL, hreflang alternates
// and static links to every language version.
export const metadata: Metadata = {
  title: "Crystolia | Quality Canola and Sunflower Cooking Oils",
  description:
    "Crystolia (קריסטוליה) is a food oil brand: quality canola oil and sunflower oil for households, restaurants, catering and the food industry. Available in Hebrew, English and Russian.",
  alternates: {
    // Root "/" is the global gateway → canonical to the English (.com) home;
    // hreflang (cross-domain) is emitted via <AlternateLinks/>.
    canonical: localeOrigin(i18n.defaultLocale as Locale),
  },
};

export default function RootPage() {
  return (
    <main id="main-content" style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <AlternateLinks subPath="" />
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
