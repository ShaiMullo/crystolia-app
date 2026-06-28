// Pure consent logic (Compliance PR-5) — no React, no DOM, fully unit-testable.
// The ConsentProvider wraps these with React state + cookie I/O.

import type { ConsentCategories, ConsentRecord, ToggleableConsent } from "./types";

// Bump CONSENT_VERSION whenever the categories or policy materially change — a
// stored cookie with an older version is treated as undecided (forces re-consent).
export const CONSENT_VERSION = 1;

export const CONSENT_COOKIE = "cl_consent";
// ~6 months, in seconds.
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export const ESSENTIAL_ONLY: ConsentCategories = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const ALL_ENABLED: ConsentCategories = {
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/** Coerce arbitrary input into a valid ConsentCategories (essential forced true). */
export function normalizeCategories(input: unknown): ConsentCategories {
  const c = (input ?? {}) as Record<string, unknown>;
  return {
    essential: true,
    functional: c.functional === true,
    analytics: c.analytics === true,
    marketing: c.marketing === true,
  };
}

/** Merge user-chosen toggles onto a base set (essential always stays true). */
export function applyPreferences(
  base: ConsentCategories,
  prefs: Partial<ToggleableConsent>,
): ConsentCategories {
  return normalizeCategories({ ...base, ...prefs });
}

/** Build a fresh, current-version record from a set of categories. */
export function makeRecord(categories: ConsentCategories): ConsentRecord {
  return {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    categories: normalizeCategories(categories),
  };
}

/** A stored record is usable only if its version matches the current one. */
export function isCurrent(record: ConsentRecord | null): record is ConsentRecord {
  return record != null && record.v === CONSENT_VERSION;
}

/** Serialize a record into a `Set-Cookie`-style string (first-party, SameSite=Lax). */
export function serializeConsentCookie(record: ConsentRecord): string {
  const value = encodeURIComponent(JSON.stringify(record));
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Parse the cl_consent record out of a `document.cookie`-style header.
 * Returns null when the cookie is missing or malformed (caller treats null as
 * "undecided"). Never throws.
 */
export function parseConsentCookie(cookieHeader: string | null | undefined): ConsentRecord | null {
  if (!cookieHeader) return null;
  const prefix = `${CONSENT_COOKIE}=`;
  const entry = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!entry) return null;

  try {
    const raw = entry.slice(prefix.length);
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.v !== "number") return null;
    return {
      v: parsed.v,
      ts: typeof parsed.ts === "string" ? parsed.ts : "",
      categories: normalizeCategories(parsed.categories),
    };
  } catch {
    return null;
  }
}
