import "./globals.css";
import type { Metadata } from "next";
import { SITE_URL, BRAND } from "@/i18n/site";
import ChosenMarker from "@/components/ChosenMarker";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Crystolia | Quality Canola and Sunflower Cooking Oils",
    template: `%s | ${BRAND}`,
  },
  description:
    "Crystolia provides quality canola and sunflower cooking oils for households, restaurants, catering businesses and retailers.",
  applicationName: BRAND,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/crystolia-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/crystolia-logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
        <ChosenMarker />
        {/* Set correct lang/dir from URL before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var locale = window.location.pathname.split('/').filter(Boolean)[0];
                  var supported = ['en', 'he', 'ru'];
                  if (supported.includes(locale)) {
                    document.documentElement.setAttribute('lang', locale);
                    document.documentElement.setAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
