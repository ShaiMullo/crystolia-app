"use client";

import type { Locale } from "../i18n/config";
import Image from "next/image";
import Link from "next/link";

interface FooterProps {
  locale: Locale;
  dict: {
    nav: {
      home: string;
      products: string;
      about: string;
      faq: string;
      contact: string;
    };
    footer: {
      brand: string;
      tagline: string;
      rights: string;
      developerCredit: string;
    };
    legal: {
      privacy: string;
      cookies: string;
      terms: string;
    };
  };
}

export default function Footer({ locale, dict }: FooterProps) {
  const isRTL = locale === "he";
  const year = new Date().getFullYear();

  return (
    <footer
      dir={isRTL ? "rtl" : "ltr"}
      className="relative py-16 bg-gradient-to-br from-[#3D2914] via-[#4A3520] to-[#3D2914] overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F5C542] to-transparent" />
      <div className="absolute top-10 right-10 w-32 h-32 bg-[#F5C542]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#B8860B]/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <Image
                src="/crystolia-logo.png"
                alt={dict.footer.brand}
                fill
                className="object-contain brightness-110"
              />
            </div>
            <span className="text-2xl font-medium tracking-tight text-white">
              {dict.footer.brand}
            </span>
          </div>

          {/* Tagline */}
          <div className="text-center">
            <p className="text-[#F5C542] text-sm font-medium tracking-wider uppercase">
              {dict.footer.tagline}
            </p>
          </div>

          {/* Copyright */}
          <div className="text-sm font-light text-white/70 text-center md:text-end">
            <p>
              &copy; {year} {dict.footer.brand}
            </p>
            <p className="mt-1 text-[#F5C542]/80">{dict.footer.rights}</p>
          </div>
        </div>

        {/* Site Links */}
        <nav className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <Link href={`/${locale}`} className="text-sm text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.nav.home}
          </Link>
          <Link href={`/${locale}#products`} className="text-sm text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.nav.products}
          </Link>
          <Link href={`/${locale}/about`} className="text-sm text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.nav.about}
          </Link>
          <Link href={`/${locale}/faq`} className="text-sm text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.nav.faq}
          </Link>
          <Link href={`/${locale}#contact`} className="text-sm text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.nav.contact}
          </Link>
        </nav>

        {/* Legal Links */}
        <nav aria-label="Legal" className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href={`/${locale}/privacy`} className="text-xs text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.legal.privacy}
          </Link>
          <Link href={`/${locale}/cookies`} className="text-xs text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.legal.cookies}
          </Link>
          <Link href={`/${locale}/terms`} className="text-xs text-white/70 hover:text-[#F5C542] transition-colors">
            {dict.legal.terms}
          </Link>
        </nav>

        {/* Developer Credit */}
        <div className="mt-6 text-center">
          <p className="text-xs font-light text-white/70">
            &copy; {year} {dict.footer.developerCredit}
          </p>
        </div>
      </div>
    </footer>
  );
}
