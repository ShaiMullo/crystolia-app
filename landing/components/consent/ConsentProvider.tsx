"use client";

// Consent state provider (Compliance PR-5). Provides the consent context to the
// whole app and persists choices to the first-party `cl_consent` cookie. It
// renders NO UI in this PR — the banner/preferences modal arrive in PR-6 and
// will consume this context via useConsent().
//
// SSR / static-export safe: `document` is only touched inside effects/handlers
// (never during render), and the initial state is identical on the server and
// the first client render (status "undecided", essential-only), so there is no
// hydration mismatch — especially since nothing visual depends on it yet.

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "../../i18n/config";
import type {
  ConsentCategories,
  ConsentCategory,
  ConsentContextValue,
  ConsentStatus,
  ToggleableConsent,
} from "./types";
import {
  ALL_ENABLED,
  ESSENTIAL_ONLY,
  applyPreferences,
  isCurrent,
  makeRecord,
  parseConsentCookie,
  serializeConsentCookie,
} from "./consentCore";
import CookieBanner from "./CookieBanner";
import PreferencesModal from "./PreferencesModal";

export const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<ConsentCategories>(ESSENTIAL_ONLY);
  const [status, setStatus] = useState<ConsentStatus>("undecided");
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // On mount (client only), hydrate from the cookie. A missing, malformed, or
  // stale-version cookie leaves status "undecided" -> the banner then shows.
  // `hydrated` flips true only after the read, so the banner never flashes for
  // users who already have a valid cookie.
  useEffect(() => {
    const record = parseConsentCookie(typeof document !== "undefined" ? document.cookie : "");
    if (isCurrent(record)) {
      setCategories(record.categories);
      setStatus("decided");
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ConsentCategories) => {
    const record = makeRecord(next);
    if (typeof document !== "undefined") {
      document.cookie = serializeConsentCookie(record);
    }
    setCategories(record.categories);
    setStatus("decided");
  }, []);

  const acceptAll = useCallback(() => persist(ALL_ENABLED), [persist]);
  const rejectNonEssential = useCallback(() => persist(ESSENTIAL_ONLY), [persist]);
  const savePreferences = useCallback(
    (prefs: Partial<ToggleableConsent>) => persist(applyPreferences(categories, prefs)),
    [persist, categories],
  );

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  const isEnabled = useCallback(
    (category: ConsentCategory) => (category === "essential" ? true : categories[category]),
    [categories],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      status,
      hydrated,
      categories,
      isEnabled,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      preferencesOpen,
      openPreferences,
      closePreferences,
    }),
    [
      status,
      hydrated,
      categories,
      isEnabled,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      preferencesOpen,
      openPreferences,
      closePreferences,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      <CookieBanner locale={locale} />
      <PreferencesModal locale={locale} />
    </ConsentContext.Provider>
  );
}
