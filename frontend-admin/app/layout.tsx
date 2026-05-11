import "./globals.css";
import type { Metadata } from "next";
import ClientProviders from "./providers/ClientProviders";

export const metadata: Metadata = {
  title: "Crystolia Admin",
  description: "Internal CRM",
  icons: {
    icon: "/crystolia-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}