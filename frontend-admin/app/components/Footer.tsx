"use client";

import type { Locale } from "../../i18n/config";
import Image from "next/image";

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
    <footer className="relative py-16 bg-gradient-to-br from-[#3D2914] via-[#4A3520] to-[#3D2914] overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F5C542] to-transparent" />
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#F5C542]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#B8860B]/5 rounded-full blur-3xl" />

      <div
        className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 ${isRTL ? "rtl text-right" : "ltr text-left"
          }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <Image
                src="/crystolia-logo.png"
                alt="Crystolia"
                fill
                className="object-contain brightness-110"
              />
            </div>
            <span className="text-2xl font-medium tracking-tight text-white">
              Crystolia
            </span>
          </div>

          {/* Tagline */}
          <div className="text-center">
            <p className="text-[#F5C542] text-sm font-medium tracking-wider uppercase">
              Premium Sunflower Oil
            </p>
          </div>

          {/* Copyright */}
          <div className="text-sm font-light text-white/70 text-center md:text-right">
            <p>{dict.footer.copyright}</p>
            <p className="mt-1 text-[#F5C542]/80">{dict.footer.rights}</p>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs font-light text-white/50">
            © {new Date().getFullYear()} All rights reserved to Shai Mullokandov
          </p>
        </div>
      </div>
    </footer>
  );
}
