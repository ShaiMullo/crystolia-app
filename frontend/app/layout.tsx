import "./globals.css";
import type { Metadata } from "next";
import { i18n } from "@/i18n/config";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Crystolia – Premium Sunflower Oil",
  description: "Import and distribution of premium quality sunflower oil. Quality without compromise.",
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
  // Root layout sets default HTML attributes
  // A blocking script (first in body) will update these based on the URL path
  // This runs synchronously before React hydration, ensuring server and client match
  const defaultDir = i18n.defaultLocale === "he" ? "rtl" : "ltr";

  return (
    <html lang={i18n.defaultLocale} dir={defaultDir} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Blocking script to set correct lang/dir from URL - runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var segments = path.split('/').filter(Boolean);
                  var locale = segments[0];
                  var supportedLocales = ['en', 'he', 'ru'];
                  
                  // If first segment is a valid locale, use it
                  if (supportedLocales.includes(locale)) {
                    var isRTL = locale === 'he';
                    var dir = isRTL ? 'rtl' : 'ltr';
                    document.documentElement.setAttribute('lang', locale);
                    document.documentElement.setAttribute('dir', dir);
                  }
                } catch(e) {
                  // Silently fail - default attributes from server will be used
                }
              })();
            `,
          }}
        />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#F5C542',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}