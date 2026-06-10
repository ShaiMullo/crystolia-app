"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { i18n } from "@/i18n/config";

/**
 * Client-side redirect from "/" to the visitor's preferred locale.
 * Rendered inside the server component at app/page.tsx so the root
 * page can still export SEO metadata (canonical + hreflang).
 */
export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const browserLang = navigator.language?.slice(0, 2);
    const supported = i18n.locales as readonly string[];
    const locale = supported.includes(browserLang) ? browserLang : i18n.defaultLocale;
    router.replace(`/${locale}`);
  }, [router]);

  return null;
}
