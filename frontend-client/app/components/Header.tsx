"use client";

import { useState, useEffect, useCallback } from "react";
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

import { useAuth } from "../context/AuthContext";

// Sunflower confetti component
interface Sunflower {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

export default function Header({ locale, dict }: HeaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sunflowers, setSunflowers] = useState<Sunflower[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress from 0 to 1 over the first 150px
      const progress = Math.min(window.scrollY / 150, 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isRTL = locale === "he";

  // Create falling sunflowers - accumulate on each click
  const createSunflowers = useCallback(() => {
    const newSunflowers: Sunflower[] = [];
    const baseId = Date.now();

    for (let i = 0; i < 8; i++) {
      const duration = Math.random() * 2 + 2;
      const delay = Math.random() * 0.3;
      const flower: Sunflower = {
        id: baseId + i,
        x: Math.random() * 100,
        size: Math.random() * 18 + 16,
        duration,
        delay,
      };
      newSunflowers.push(flower);

      // Remove each flower individually after its animation completes
      setTimeout(() => {
        setSunflowers(prev => prev.filter(f => f.id !== flower.id));
      }, (duration + delay) * 1000);
    }

    // Add new flowers to existing ones instead of replacing
    setSunflowers(prev => [...prev, ...newSunflowers]);
  }, []);

  return (
    <>
      {/* Falling Sunflowers Container */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {sunflowers.map((flower) => (
          <div
            key={flower.id}
            className="absolute animate-fall"
            style={{
              left: `${flower.x}%`,
              fontSize: `${flower.size}px`,
              animationDuration: `${flower.duration}s`,
              animationDelay: `${flower.delay}s`,
            }}
          >
            🌻
          </div>
        ))}
      </div>

      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out"
        style={{
          background: scrollProgress > 0
            ? `linear-gradient(to right, rgba(255,255,255,${scrollProgress * 0.95}), rgba(255,248,231,${scrollProgress * 0.9}), rgba(255,255,255,${scrollProgress * 0.95}))`
            : 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
          backdropFilter: scrollProgress > 0 ? `blur(${scrollProgress * 20}px)` : 'none',
          boxShadow: scrollProgress > 0.5 ? `0 4px 20px rgba(0,0,0,${scrollProgress * 0.1})` : 'none',
          padding: `${1.25 - scrollProgress * 0.75}rem 0`,
          borderBottom: scrollProgress > 0.5 ? `1px solid rgba(245,197,66,${scrollProgress * 0.2})` : 'none',
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          {/* Logo Only - No Text */}
          <button
            onClick={createSunflowers}
            className="group relative cursor-pointer focus:outline-none"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 w-14 h-14 md:w-18 md:h-18 rounded-full bg-[#F5C542]/40 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500" />

            {/* Logo Container */}
            <div className="relative w-14 h-14 md:w-[72px] md:h-[72px] rounded-full overflow-hidden transition-all duration-300 group-hover:scale-110 shadow-lg shadow-[#F5C542]/30 group-hover:shadow-xl group-hover:shadow-[#F5C542]/50 ring-2 ring-[#F5C542]/30 group-hover:ring-[#F5C542]/60">
              <Image
                src="/crystolia-logo.png"
                alt="Crystolia"
                fill
                className="object-cover scale-105"
                priority
              />
            </div>
          </button>

          {/* Navigation Links - Desktop */}
          <div
            className={`hidden md:flex items-center gap-10 ${isRTL ? "flex-row-reverse" : ""
              }`}
          >
            <a
              href="#home"
              className="text-base font-medium tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                color: scrollProgress > 0.5 ? '#3D2914' : 'rgba(255,255,255,0.9)',
                textShadow: scrollProgress > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {dict.nav.home}
            </a>
            <a
              href="#products"
              className="text-base font-medium tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                color: scrollProgress > 0.5 ? '#3D2914' : 'rgba(255,255,255,0.9)',
                textShadow: scrollProgress > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {dict.nav.products}
            </a>
            <a
              href="#features"
              className="text-base font-medium tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                color: scrollProgress > 0.5 ? '#3D2914' : 'rgba(255,255,255,0.9)',
                textShadow: scrollProgress > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {dict.nav.features}
            </a>
            <a
              href="#about"
              className="text-base font-medium tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                color: scrollProgress > 0.5 ? '#3D2914' : 'rgba(255,255,255,0.9)',
                textShadow: scrollProgress > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {dict.nav.about}
            </a>
            <a
              href="#contact"
              className="text-base font-medium tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                color: scrollProgress > 0.5 ? '#3D2914' : 'rgba(255,255,255,0.9)',
                textShadow: scrollProgress > 0.5 ? 'none' : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {dict.nav.contact}
            </a>
          </div>

          {/* Business Login Button + Language Switcher */}
          <div className="flex items-center gap-4">
            {user ? (
              <a
                href={`/${locale}/dashboard`}
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#F5C542] to-[#B8860B] text-white rounded-full text-sm font-medium shadow-lg shadow-[#F5C542]/30 hover:shadow-xl hover:shadow-[#F5C542]/40 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {user.firstName || "Dashboard"}
              </a>
            ) : (
              <a
                href={`/${locale}/auth`}
                className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#F5C542] to-[#B8860B] text-white rounded-full text-sm font-medium shadow-lg shadow-[#F5C542]/30 hover:shadow-xl hover:shadow-[#F5C542]/40 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {dict.nav.businessLogin || "לעסקים"}
              </a>
            )}

            <LanguageSwitcher />
          </div>
        </nav>
      </header>
    </>
  );
}

