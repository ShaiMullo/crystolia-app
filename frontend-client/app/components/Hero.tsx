"use client";

import Image from "next/image";
import type { Locale } from "../../i18n/config";

interface HeroProps {
  locale: Locale;
  dict: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
      whatsapp: string;
      contactNow: string;
      leaveDetails: string;
    };
  };
}

export default function Hero({ locale, dict }: HeroProps) {
  const isRTL = locale === "he";

  const handleWhatsApp = () => {
    window.open(
      "https://wa.me/972546970555?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%9C%D7%A7%D7%91%D7%9C%20%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%95%D7%94%D7%A6%D7%A2%D7%AA%20%D7%9E%D7%97%D7%99%D7%A8%20%D7%A2%D7%91%D7%95%D7%A8%20%D7%A9%D7%9E%D7%9F%20%D7%97%D7%9E%D7%A0%D7%99%D7%95%D7%AA%2F%D7%A7%D7%A0%D7%95%D7%9C%D7%94%20%D7%91%D7%9B%D7%9E%D7%95%D7%99%D7%95%D7%AA.%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%A9%D7%99%D7%97%D7%96%D7%A8%D7%95%20%D7%90%D7%9C%D7%99%D7%99.",
      "_blank"
    );
  };

  const handleContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLeaveDetails = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/sunflower-bg.jpg"
          alt="Sunflower background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
      </div>

      {/* Layered Overlay for strong readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#3D2914]/50 via-transparent to-[#B8860B]/20" />

      {/* Decorative Gradient Accents */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-[#F5C542]/8 to-transparent" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/3 bg-gradient-to-tl from-[#B8860B]/15 to-transparent" />

      {/* Content */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 text-center pt-32 pb-24"
      >
        {/* Badge */}
        <div className="mb-8 animate-fade-in">
          <span className="inline-block px-6 py-2.5 rounded-full bg-[#F5C542]/15 backdrop-blur-sm text-[#FFE082] text-xs sm:text-sm font-semibold tracking-widest uppercase border border-[#F5C542]/30">
            {dict.hero.subtitle}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 animate-slide-up hero-title">
          {dict.hero.title}
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl md:text-2xl font-light text-white/90 max-w-2xl mx-auto mb-14 leading-relaxed animate-fade-in-delay hero-description">
          {dict.hero.description}
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 ${
            isRTL ? "sm:flex-row-reverse" : ""
          } animate-fade-in-delay-2`}
        >
          {/* Primary: WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="btn-premium px-8 sm:px-10 py-4 bg-gradient-to-r from-[#F5C542] via-[#FFD700] to-[#B8860B] text-[#3D2914] rounded-full font-semibold text-base tracking-wide shadow-lg shadow-[#F5C542]/30 hover:shadow-xl hover:shadow-[#F5C542]/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
          >
            <span className="flex items-center gap-2.5">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {dict.hero.whatsapp}
            </span>
          </button>

          {/* Secondary: Contact Now */}
          <button
            onClick={handleContact}
            className="px-8 sm:px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold text-base tracking-wide border border-white/25 hover:bg-white/20 hover:border-[#F5C542]/60 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
          >
            {dict.hero.contactNow}
          </button>

          {/* Tertiary: Leave Details */}
          <button
            onClick={handleLeaveDetails}
            className="px-6 py-3 text-[#FFE082]/90 font-medium text-sm tracking-wide hover:text-white transition-colors duration-300 underline underline-offset-4 decoration-[#F5C542]/40 hover:decoration-white/60"
          >
            {dict.hero.leaveDetails}
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/40 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
