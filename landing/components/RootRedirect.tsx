"use client";

import { useEffect } from "react";
import { i18n, type Locale } from "@/i18n/config";
import { localeForHostname } from "@/i18n/manifest";

/**
 * Client-side redirect from the "/" gateway to a locale homepage.
 *
 * Locale resolution, in priority order:
 * 1. An explicit prior language choice (cl_loc cookie) → this domain's own
 *    canonical locale. The cookie is set only when the user actively picks a
 *    language, so browser-language detection must not override it.
 * 2. The browser language, when the site supports it.
 * 3. This domain's canonical locale, then the global default.
 *
 * Locale pages never redirect back to "/", so this cannot loop. Uses
 * location.replace because the gateway and /[locale] are separate root
 * layouts — any navigation between them is a full document load anyway, and
 * replace() keeps the gateway out of the back-button history.
 */
export default function RootRedirect() {
  useEffect(() => {
    const supported = i18n.locales as readonly string[];
    const domainLocale = localeForHostname(window.location.hostname);

    let hasExplicitChoice = false;
    try {
      hasExplicitChoice = document.cookie
        .split(";")
        .some((c) => c.trim().startsWith("cl_loc="));
    } catch {
      /* cookies unavailable → fall through to detection */
    }

    let locale: Locale;
    if (hasExplicitChoice && domainLocale) {
      locale = domainLocale;
    } else {
      const browserLang = navigator.language?.slice(0, 2);
      locale = supported.includes(browserLang)
        ? (browserLang as Locale)
        : (domainLocale ?? (i18n.defaultLocale as Locale));
    }

    // CloudFront error-fallback can serve this gateway page AT another URL
    // (e.g. /en while its object is missing mid-deploy). Redirecting there to
    // the path we are already on would reload the gateway forever — bail and
    // leave the static language links usable instead.
    const target = `/${locale}`;
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path !== target) window.location.replace(target);
  }, []);

  return null;
}
