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
        ${
          scrolled
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
          className={`hidden md:flex items-center gap-8 ${
            isRTL ? "flex-row-reverse" : ""
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

        {/* Language Switcher */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
