// Pure accessibility-widget logic — no React, no DOM, fully unit-testable.
// The widget wraps these with React state + cookie I/O + a small DOM applier.
// Settings persist in the first-party `cl_a11y` cookie (SameSite=Lax, Path=/).

export interface A11ySettings {
  /** Text-size step; 0 = default. Negative shrinks, positive enlarges. */
  text: number;
  /** High-contrast mode. */
  contrast: boolean;
  /** Reduce motion (user toggle; complements the OS prefers-reduced-motion). */
  motion: boolean;
  /** Highlight links (underline). */
  links: boolean;
}

export const A11Y_COOKIE = "cl_a11y";
export const A11Y_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // ~1 year

export const TEXT_MIN = -1;
export const TEXT_MAX = 4;

export const DEFAULT_SETTINGS: A11ySettings = {
  text: 0,
  contrast: false,
  motion: false,
  links: false,
};

/** Clamp a text step into the supported range. */
export function clampText(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(TEXT_MIN, Math.min(TEXT_MAX, Math.round(n)));
}

/** Coerce arbitrary input into valid settings (defensive against stale cookies). */
export function normalizeSettings(input: unknown): A11ySettings {
  const o = (input ?? {}) as Record<string, unknown>;
  return {
    text: typeof o.text === "number" ? clampText(o.text) : 0,
    contrast: o.contrast === true,
    motion: o.motion === true,
    links: o.links === true,
  };
}

/** True when settings are all default (used to drop the cookie on reset). */
export function isDefault(s: A11ySettings): boolean {
  return s.text === 0 && !s.contrast && !s.motion && !s.links;
}

/** Serialize settings into a `Set-Cookie`-style string (first-party, SameSite=Lax). */
export function serializeA11yCookie(s: A11ySettings): string {
  const value = encodeURIComponent(JSON.stringify(normalizeSettings(s)));
  return `${A11Y_COOKIE}=${value}; Path=/; Max-Age=${A11Y_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Expire the cookie (used by Reset). */
export function clearA11yCookie(): string {
  return `${A11Y_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Parse settings out of a `document.cookie`-style header.
 * Returns null when missing or malformed (caller treats null as defaults).
 * Never throws.
 */
export function parseA11yCookie(cookieHeader: string | null | undefined): A11ySettings | null {
  if (!cookieHeader) return null;
  const prefix = `${A11Y_COOKIE}=`;
  const entry = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!entry) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(entry.slice(prefix.length))) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return normalizeSettings(parsed);
  } catch {
    return null;
  }
}
