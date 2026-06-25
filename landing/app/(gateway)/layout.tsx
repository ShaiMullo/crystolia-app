import "../globals.css";
import { baseMetadata } from "@/app/_shared/metadata";
import ChosenMarker from "@/components/ChosenMarker";

export const metadata = baseMetadata;

// The "/" gateway is the global English (x-default) entry point, so its <html>
// is always lang="en" dir="ltr". Localized pages live under /[locale] and emit
// their own lang/dir.
export default function GatewayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Persist an explicit language choice (?chosen=1) + clean the URL. */}
        <ChosenMarker />
        {children}
      </body>
    </html>
  );
}
