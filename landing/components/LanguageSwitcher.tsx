"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { i18n, type Locale } from "../i18n/config";
import { localeOrigin } from "../i18n/site";

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: "he", flag: "\u{1F1EE}\u{1F1F1}", label: "\u05E2\u05D1\u05E8\u05D9\u05EA" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "ru", flag: "\u{1F1F7}\u{1F1FA}", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
];

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentLocale = (pathname.split("/")[1] || i18n.defaultLocale) as Locale;

  const changeLocale = (locale: Locale) => {
    if (locale === currentLocale) return;

    // Path after the current locale segment: "" for the homepage, "/faq" etc.
    const rest = pathname.replace(/^\/(he|en|ru)(?=\/|$)/, "");
    const sub = rest === "/" ? "" : rest;

    // Match the canonical structure: homepage → bare apex domain;
    // sub-pages keep /{locale}/<path>.
    const origin = localeOrigin(locale);
    const dest = sub ? `${origin}/${locale}${sub}` : origin;

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
