import type { Locale } from "../config";

// Shared content shape for the long-form legal pages (privacy, cookies, terms).
// Mirrors the existing about.ts / faq.ts page-content pattern so the future
// legal pages (Compliance PR-4) and their generateMetadata can consume it
// uniformly. Nothing renders these types yet — this is scaffolding only.

export interface LegalSection {
  heading: string;
  /** Plain paragraphs, rendered in order. */
  paragraphs: string[];
}

export interface LegalPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  /** ISO date (YYYY-MM-DD) of the last revision; shown as "Last updated …". */
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

// Per-locale content map. `Partial` is deliberate: a page may be scaffolded
// empty until its real, counsel-reviewed copy lands. An absent locale simply
// isn't ready to render — no route consumes these in this PR.
export type LegalContent = Partial<Record<Locale, LegalPageContent>>;
