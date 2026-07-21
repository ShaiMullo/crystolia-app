// Reads the Crystolia platform manifest (single source of truth, owned by
// crystolia-infra) and exposes per-market metadata to the landing app.
//
// `domains.lock.json` is a VENDORED COPY of crystolia-infra/manifest/
// domains.lock.json (generated from domains.manifest.yaml). It must be kept in
// sync with the canonical file; a CI drift-check is planned follow-up work.
//
// SCOPE (Step 1): the app sources only immutable market metadata from the
// manifest — per-locale canonical/SEO hosts. Presentation concerns that affect
// static output (locale tuple ORDER, the global defaultLocale / x-default) stay
// in i18n/config.ts, by design, so the build is byte-for-byte unchanged.
import lock from "../domains.lock.json";
import { i18n, type Locale } from "./config";

interface MarketSeo {
  host: string;
  robotsHost: string;
  sitemapHost: string;
}

interface Market {
  id: string;
  domain: string;
  locale: string;
  defaultLocale: string;
  status: string;
  seo: MarketSeo;
}

const markets = (lock as { markets: Market[] }).markets;

// First market per locale (one domain per locale today).
const marketByLocale = new Map<string, Market>();
for (const m of markets) {
  if (!marketByLocale.has(m.locale)) marketByLocale.set(m.locale, m);
}

// ── Fail-fast consistency check: app locales <-> manifest locales must match ──
// Keeps the manifest authoritative for which markets exist while config.ts
// stays the authority for ordering. Divergence breaks the build immediately.
const manifestLocales = new Set(markets.map((m) => m.locale));
for (const locale of i18n.locales) {
  if (!manifestLocales.has(locale)) {
    throw new Error(
      `Manifest is missing locale "${locale}" declared in i18n/config.ts.`,
    );
  }
}
for (const locale of manifestLocales) {
  if (!(i18n.locales as readonly string[]).includes(locale)) {
    throw new Error(
      `i18n/config.ts is missing locale "${locale}" present in the manifest.`,
    );
  }
}

/** The manifest market for a locale. */
export function marketForLocale(locale: Locale): Market {
  const m = marketByLocale.get(locale);
  if (!m) throw new Error(`No manifest market for locale "${locale}".`);
  return m;
}

/** Canonical/SEO host (origin, no trailing slash) for a locale. */
export function localeHost(locale: Locale): string {
  return marketForLocale(locale).seo.host;
}

/** Lifecycle status of a locale's market (planned | provisioned | live | retired). */
export function marketStatus(locale: Locale): string {
  return marketForLocale(locale).status;
}

/**
 * Locale whose market canonically owns `hostname` (apex or www), or null when
 * the host belongs to no market (localhost, raw CloudFront/S3 preview hosts).
 */
export function localeForHostname(hostname: string): Locale | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const market = markets.find((m) => m.domain === host);
  return market ? (market.locale as Locale) : null;
}

/**
 * Whether a locale's market is publicly reachable on its own canonical domain.
 * ONLY `status === "live"` qualifies — i.e. the domain has gone live (apex/www
 * A-ALIAS records exist, go_live=true). A `provisioned` market has infrastructure
 * (bucket/CloudFront/cert) but is NOT yet public (no apex/www, go_live=false), so
 * routing a user to its canonical host would hit a non-resolving domain. Callers
 * (e.g. the language switcher) must keep the user on the current domain for any
 * non-`live` market.
 */
export function isLocaleLive(locale: Locale): boolean {
  return marketStatus(locale) === "live";
}
