import type { Metadata } from "next";
import { SITE_URL, BRAND } from "@/i18n/site";

// Base metadata shared by every root layout (the locale subtree and the "/"
// gateway). Per-page files still override title/description/canonical/hreflang.
export const baseMetadata: Metadata = {
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
