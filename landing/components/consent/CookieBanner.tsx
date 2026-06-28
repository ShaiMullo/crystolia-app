"use client";

// Cookie consent banner (Compliance PR-6). Non-blocking, fixed-bottom card in
// the Crystolia dark-chocolate + gold palette. Client-only: renders nothing until
// the cookie has been read (`hydrated`), then shows only while the decision is
// undecided and the preferences modal is closed — so there is no SSR markup, no
// flash for returning visitors, and no layout shift (position: fixed).

import Link from "next/link";
import type { Locale } from "../../i18n/config";
import { getDictionary } from "../../i18n/getDictionary";
import { useConsent } from "./useConsent";

export default function CookieBanner({ locale }: { locale: Locale }) {
  const { hydrated, status, preferencesOpen, acceptAll, rejectNonEssential, openPreferences } =
    useConsent();

  if (!hydrated || status !== "undecided" || preferencesOpen) return null;

  const dict = getDictionary(locale);
  const c = dict.consent;
  const isRTL = locale === "he";

  return (
    <div
      role="region"
      aria-label={c.banner.title}
      dir={isRTL ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#F5C542]/25 bg-[#3D2914] shadow-2xl">
        {/* gold top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#F5C542] to-transparent" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:gap-6">
          <div className="flex-1">
            <p className="text-base font-semibold text-[#FFF8E7]">{c.banner.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#FFF8E7]/75">
              {c.banner.description}{" "}
              <Link
                href={`/${locale}/cookies`}
                className="font-medium text-[#F5C542] underline underline-offset-2 hover:text-[#FFE082]"
              >
                {c.banner.cookiePolicy}
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <button
              type="button"
              onClick={(e) => openPreferences(e.currentTarget)}
              className="order-3 rounded-full px-4 py-2.5 text-sm font-medium text-[#FFF8E7]/80 transition-colors hover:text-[#F5C542] sm:order-1"
            >
              {c.actions.managePreferences}
            </button>
            <button
              type="button"
              onClick={rejectNonEssential}
              className="order-2 rounded-full border border-[#F5C542]/50 px-5 py-2.5 text-sm font-medium text-[#F5C542] transition-colors hover:bg-[#F5C542]/10"
            >
              {c.actions.rejectNonEssential}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="order-1 rounded-full bg-[#F5C542] px-6 py-2.5 text-sm font-semibold text-[#3D2914] transition-colors hover:bg-[#FFE082] sm:order-3"
            >
              {c.actions.acceptAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
