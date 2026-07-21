"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { i18n, type Locale } from "../i18n/config";
import { localeOrigin } from "../i18n/site";
import { isLocaleLive } from "../i18n/manifest";
import { isLocaleRoute } from "../i18n/routes";

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: "he", flag: "\u{1F1EE}\u{1F1F1}", label: "\u05E2\u05D1\u05E8\u05D9\u05EA" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "ru", flag: "\u{1F1F7}\u{1F1FA}", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
];

// Strips a leading "/<locale>" segment from a pathname.
const LOCALE_PREFIX = new RegExp(`^/(${i18n.locales.join("|")})(?=/|$)`);

export default function LanguageSwitcher({
  currentLocale,
}: {
  currentLocale: Locale;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // `currentLocale` is the page's real locale (passed from the server component
  // via Header) and is authoritative. The URL has no locale segment on a
  // localized apex (e.g. crystolia.ru/ serves the /ru page), so deriving the
  // locale from the path there wrongly yields the global default and makes
  // "switch to English" a no-op — the bug this fixes.

  const changeLocale = (locale: Locale) => {
    if (locale === currentLocale) return;

    // Path after the locale segment: "" for the homepage, "/faq" etc. On a
    // localized apex the URL has no locale segment, so this yields "".
    const rest = pathname.replace(LOCALE_PREFIX, "").replace(/\/+$/, "");
    // Only sub-paths that exist in every locale's export are preserved;
    // anything else (404 page, unknown URL) goes to the locale homepage.
    const sub = isLocaleRoute(rest) ? rest : "";

    // Live market → its own canonical domain (per-domain SEO). A non-live
    // market's domain may not resolve yet, so stay on the current domain —
    // the static export deployed here already contains every /<locale>.
    const origin = isLocaleLive(locale)
      ? localeOrigin(locale)
      : window.location.origin;

    // Always target the full /{locale} path, never a bare apex: the .com root
    // serves the language gateway, which redirects by *browser* language and
    // would both override the user's explicit choice and flash the gateway
    // fallback page mid-navigation.
    const dest = `${origin}/${locale}${sub}`;

    // Mark this as an explicit choice so the .com CloudFront geo/language
    // redirect won't override it (loop-safe), and persist it first-party so
    // returning to this domain won't auto-redirect either.
    try {
      document.cookie = "cl_loc=1; path=/; max-age=31536000; samesite=lax";
    } catch {}
    const url = `${dest}${dest.includes("?") ? "&" : "?"}chosen=1`;

    startTransition(() => {
      // Cross-domain navigation → full load (router.push is same-origin only).
      window.location.assign(url);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLocale(lang.code)}
          disabled={isPending}
          className={`
            relative px-3 py-1.5 rounded-full
            transition-all duration-300 ease-out
            hover:scale-110 active:scale-95
            ${
              currentLocale === lang.code
                ? "bg-gradient-to-r from-[#F5C542]/20 to-[#F5C542]/10 backdrop-blur-sm"
                : "hover:bg-white/10"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={`Switch to ${lang.label}`}
        >
          <span className="text-2xl leading-none">{lang.flag}</span>
        </button>
      ))}
    </div>
  );
}
