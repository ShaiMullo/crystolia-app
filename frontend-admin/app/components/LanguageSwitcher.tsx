"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "../../i18n/config";

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: "he", flag: "🇮🇱", label: "עברית" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentLocale = (pathname.split("/")[1] || "en") as Locale;

  const changeLocale = (locale: Locale) => {
    startTransition(() => {
      const newPath = pathname.replace(/^\/(he|en|ru)/, `/${locale}`) || `/${locale}`;
      router.push(newPath);
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
