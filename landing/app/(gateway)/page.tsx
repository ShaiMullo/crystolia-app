import type { CSSProperties } from "react";
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

// Same-domain links: every domain's bucket serves all three /{locale} exports,
// so relative hrefs work no matter which apex the gateway is reached on.
const languageLinks = [
  {
    href: "/en",
    lang: "en",
    dir: "ltr",
    name: "English",
    detail: "Crystolia canola & sunflower oils",
  },
  {
    href: "/he",
    lang: "he",
    dir: "rtl",
    name: "עברית",
    detail: "שמן קריסטוליה: שמן קנולה ושמן חמניות",
  },
  {
    href: "/ru",
    lang: "ru",
    dir: "ltr",
    name: "Русский",
    detail: "Масло Crystolia: рапсовое и подсолнечное",
  },
] as const;

// Inline styles only: the gateway must look branded on its very first paint,
// even before the external stylesheet is fetched (and with CSS disabled).
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const linkStyle: CSSProperties = {
  display: "block",
  padding: "0.875rem 1.5rem",
  borderRadius: "9999px",
  border: "1px solid rgba(184, 134, 11, 0.35)",
  background: "#ffffff",
  color: "#3D2914",
  textDecoration: "none",
  fontWeight: 500,
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
};

export default function RootPage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2.5rem 1.5rem",
        backgroundColor: "#FFF8E7",
        color: "#3D2914",
        fontFamily: FONT_STACK,
        textAlign: "center",
      }}
    >
      <AlternateLinks subPath="" />
      <RootRedirect />
      {/* eslint-disable-next-line @next/next/no-img-element -- static export
          serves unoptimized images; a plain <img> keeps the splash dependency-free. */}
      <img
        src="/crystolia-logo.png"
        alt=""
        width={96}
        height={96}
        style={{
          borderRadius: "50%",
          boxShadow: "0 4px 20px rgba(245, 197, 66, 0.35)",
        }}
      />
      <h1
        style={{
          margin: 0,
          fontSize: "1.75rem",
          lineHeight: 1.3,
          fontWeight: 600,
          maxWidth: "34rem",
        }}
      >
        Crystolia — Quality Canola &amp; Sunflower Cooking Oils
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: "34rem",
          lineHeight: 1.6,
          color: "#5D4037",
        }}
      >
        Crystolia is a food oil brand: canola oil and sunflower oil for
        households, restaurants, catering and the food industry.
      </p>
      {/* Reads correctly both mid-redirect (JS) and as a static page (no JS).
          #8B6508 keeps the gold tone at a WCAG-AA 5:1 ratio on the cream bg. */}
      <p style={{ margin: 0, fontSize: "0.95rem", color: "#8B6508" }}>
        One moment — taking you to your language, or choose below.
      </p>
      <nav aria-label="Choose your language">
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            minWidth: "min(20rem, 100%)",
          }}
        >
          {languageLinks.map((link) => (
            <li key={link.lang}>
              <a href={link.href} lang={link.lang} dir={link.dir} style={linkStyle}>
                {link.name} — {link.detail}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
