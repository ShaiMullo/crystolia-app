import { hreflangAlternates } from "@/i18n/site";

/**
 * Cross-domain hreflang alternates emitted as real <link> tags (React hoists
 * them into <head>). Next's metadata `alternates.languages` can't be used for
 * this: it rewrites every entry's host to `metadataBase`, collapsing the
 * per-locale domains onto crystolia.com. Canonical (via metadata) is unaffected.
 *
 * `subPath` is the path after the locale segment: "" (home), "/faq", "/about",
 * "/sunflower-oil", "/canola-oil".
 */
export default function AlternateLinks({ subPath = "" }: { subPath?: string }) {
  const languages = hreflangAlternates(subPath);
  // Spread `{ hreflang }` so the emitted HTML attribute is lowercase `hreflang`.
  return (
    <>
      {Object.entries(languages).map(([hreflang, href]) => (
        <link key={hreflang} rel="alternate" {...{ hreflang }} href={href} />
      ))}
    </>
  );
}
