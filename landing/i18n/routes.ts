// Single source of truth for the sub-routes every locale exports, relative to
// /{locale}. "" = homepage. Shared by the sitemap and the language switcher so
// the switcher only preserves paths that actually exist in the static export.
export const LOCALE_ROUTES = [
  "",
  "/about",
  "/faq",
  "/canola-oil",
  "/sunflower-oil",
  "/privacy",
  "/cookies",
  "/terms",
] as const;

export type LocaleRoute = (typeof LOCALE_ROUTES)[number];

/** Whether a locale-relative sub-path ("" or "/about") maps to a real page. */
export function isLocaleRoute(subPath: string): subPath is LocaleRoute {
  return (LOCALE_ROUTES as readonly string[]).includes(subPath);
}
