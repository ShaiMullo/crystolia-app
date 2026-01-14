"use client";

import { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import Image from "next/image";
import type { Locale } from "../../i18n/config";

interface HeaderProps {
  locale: Locale;
  dict: {
    nav: {
      home: string;
      products: string;
      features: string;
      about: string;
      contact: string;
      businessLogin?: string;
    };
  };
}

export default function Header({ locale, dict }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isRTL = locale === "he";

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-500 ease-out
        ${scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-sm py-3"
          : "bg-transparent py-6"
        }
      `}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <Image
              src="/crystolia-logo.png"
              alt="Crystolia"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl md:text-3xl font-light tracking-tight text-gray-900">
            Crystolia
          </span>
        </div>

        {/* Navigation Links - Desktop */}
        <div
          className={`hidden md:flex items-center gap-8 ${isRTL ? "flex-row-reverse" : ""
            }`}
        >
          <a
            href="#home"
            className="text-sm font-light text-gray-700 hover:text-[#F5C542] transition-colors duration-300"
          >
            {dict.nav.home}
          </a>
          <a
            href="#products"
            className="text-sm font-light text-gray-700 hover:text-[#F5C542] transition-colors duration-300"
          >
            {dict.nav.products}
          </a>
          <a
            href="#features"
            className="text-sm font-light text-gray-700 hover:text-[#F5C542] transition-colors duration-300"
          >
            {dict.nav.features}
          </a>
          <a
            href="#about"
            className="text-sm font-light text-gray-700 hover:text-[#F5C542] transition-colors duration-300"
          >
            {dict.nav.about}
          </a>
          <a
            href="#contact"
            className="text-sm font-light text-gray-700 hover:text-[#F5C542] transition-colors duration-300"
          >
            {dict.nav.contact}
          </a>
        </div>

        {/* Business Login Button + Language Switcher */}
        <div className="flex items-center gap-4">
          <a
            href={`/${locale}/auth`}
            className="hidden md:flex items-center gap-2 px-5 py-2 bg-[#F5C542] text-white rounded-full text-sm font-light hover:bg-[#d4a83a] transition-all duration-300 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {dict.nav.businessLogin || "לעסקים"}
          </a>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
