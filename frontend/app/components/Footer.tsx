"use client";

import type { Locale } from "../../i18n/config";

interface FooterProps {
  locale: Locale;
  dict: {
    footer: {
      copyright: string;
      rights: string;
    };
  };
}

export default function Footer({ locale, dict }: FooterProps) {
  const isRTL = locale === "he";

  return (
    <footer className="relative py-16 bg-gray-50 border-t border-gray-100">
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-12 ${
          isRTL ? "rtl text-right" : "ltr text-left"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-light tracking-tight text-gray-900">
              Crystolia
            </span>
          </div>

          {/* Copyright */}
          <div className="text-sm font-extralight text-gray-500">
            <p>{dict.footer.copyright}</p>
            <p className="mt-1">{dict.footer.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
