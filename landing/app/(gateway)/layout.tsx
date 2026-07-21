import "../globals.css";
import { baseMetadata } from "@/app/_shared/metadata";
import ChosenMarker from "@/components/ChosenMarker";
import A11yWidget from "@/components/a11y/A11yWidget";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { getDictionary } from "@/i18n/getDictionary";
import { i18n, type Locale } from "@/i18n/config";

export const metadata = baseMetadata;

// The "/" gateway is the global English (x-default) entry point, so its <html>
// is always lang="en" dir="ltr". Localized pages live under /[locale] and emit
// their own lang/dir.
export default function GatewayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The gateway is always English (x-default).
  const dict = getDictionary(i18n.defaultLocale as Locale);
  // Inline brand colors on <html> so the gateway's first paint is Crystolia
  // cream even before the external stylesheet loads — never a bare white page.
  return (
    <html
      lang="en"
      dir="ltr"
      style={{ backgroundColor: "#FFF8E7", color: "#3D2914" }}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* Keyboard skip link — first focusable element, jumps to <main id="main-content">. */}
        <a href="#main-content" className="skip-link">
          {dict.a11y.skipToMain}
        </a>
        {/* Consent state + UI (cookie banner / preferences modal) for the app. */}
        <ConsentProvider locale={i18n.defaultLocale as Locale}>
          {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
          <ChosenMarker />
          {children}
        </ConsentProvider>
        {/* Native accessibility widget (floating button + preferences panel). */}
        <A11yWidget locale={i18n.defaultLocale as Locale} />
      </body>
    </html>
  );
}
