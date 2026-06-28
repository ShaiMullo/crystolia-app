import "../globals.css";
import { baseMetadata } from "@/app/_shared/metadata";
import ChosenMarker from "@/components/ChosenMarker";
import A11yWidget from "@/components/a11y/A11yWidget";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { i18n, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export const metadata = baseMetadata;

// Prerender one <html> per locale for the static export.
export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = i18n.locales.includes(raw as Locale)
    ? (raw as Locale)
    : (i18n.defaultLocale as Locale);
  const dir = locale === "he" ? "rtl" : "ltr";
  const dict = getDictionary(locale);

  // lang/dir are emitted server-side so crawlers see the correct values in the
  // static HTML (no client-side patch needed).
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Keyboard skip link — first focusable element, jumps to <main id="main-content">. */}
        <a href="#main-content" className="skip-link">
          {dict.a11y.skipToMain}
        </a>
        {/* Consent state + UI (cookie banner / preferences modal) for the app. */}
        <ConsentProvider locale={locale}>
          {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
          <ChosenMarker />
          {children}
        </ConsentProvider>
        {/* Native accessibility widget (floating button + preferences panel). */}
        <A11yWidget locale={locale} />
      </body>
    </html>
  );
}
