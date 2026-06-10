"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { i18n } from "@/i18n/config";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const browserLang = navigator.language?.slice(0, 2);
    const supported = i18n.locales as readonly string[];
    const locale = supported.includes(browserLang) ? browserLang : i18n.defaultLocale;
    router.replace(`/${locale}`);
  }, [router]);

  // Static fallback links so crawlers and no-JS clients hitting "/" can
  // still discover every language version of the site.
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
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
