import "../globals.css";
import { baseMetadata } from "@/app/_shared/metadata";
import ChosenMarker from "@/components/ChosenMarker";
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
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Keyboard skip link — first focusable element, jumps to <main id="main-content">. */}
        <a href="#main-content" className="skip-link">
          {dict.a11y.skipToMain}
        </a>
        {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
        <ChosenMarker />
        {children}
      </body>
    </html>
  );
}
