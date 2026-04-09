import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crystolia – Premium Sunflower Oil",
  description:
    "Import and distribution of premium quality sunflower oil. Quality without compromise.",
  icons: {
    icon: "/crystolia-logo.png",
    shortcut: "/crystolia-logo.png",
    apple: "/crystolia-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Set correct lang/dir from URL before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var locale = window.location.pathname.split('/').filter(Boolean)[0];
                  var supported = ['en', 'he', 'ru'];
                  if (supported.includes(locale)) {
                    document.documentElement.setAttribute('lang', locale);
                    document.documentElement.setAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
