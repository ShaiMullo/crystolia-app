import "../globals.css";
import { baseMetadata } from "@/app/_shared/metadata";
import ChosenMarker from "@/components/ChosenMarker";
import { i18n, type Locale } from "@/i18n/config";

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

  // lang/dir are emitted server-side so crawlers see the correct values in the
  // static HTML (no client-side patch needed).
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
        <ChosenMarker />
        {children}
      </body>
    </html>
  );
}
