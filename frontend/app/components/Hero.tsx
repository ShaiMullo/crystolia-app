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
    const phone = "972501234567"; // Replace with actual WhatsApp number
    const message = encodeURIComponent(dict.hero.whatsapp);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
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
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24"
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

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div
        className={`relative z-10 max-w-6xl mx-auto px-6 lg:px-12 text-center ${
          isRTL ? "rtl" : "ltr"
        }`}
      >
        {/* Subtitle */}
        <div className="mb-6 animate-fade-in">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5C542]/20 backdrop-blur-sm text-[#F5C542] text-sm font-light tracking-wider uppercase">
            {dict.hero.subtitle}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extralight tracking-tight text-white mb-6 animate-slide-up drop-shadow-lg">
          <span className="block">{dict.hero.title}</span>
        </h1>

        {/* Description */}
        <p className="text-xl md:text-2xl font-light text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-delay drop-shadow-md">
          {dict.hero.description}
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${
            isRTL ? "sm:flex-row-reverse" : ""
          } animate-fade-in-delay-2`}
        >
          {/* WhatsApp Button */}
          <button
            onClick={handleWhatsApp}
            className="group relative px-8 py-4 bg-[#F5C542] text-white rounded-full font-light text-base tracking-wide hover:bg-[#F5C542]/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {dict.hero.whatsapp}
            </span>
          </button>

          {/* Contact Now Button */}
          <button
            onClick={handleContact}
            className="group px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-full font-light text-base tracking-wide border border-white/20 hover:border-[#F5C542] hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {dict.hero.contactNow}
          </button>

          {/* Leave Details Button */}
          <button
            onClick={handleLeaveDetails}
            className="group px-8 py-4 bg-transparent text-white/90 rounded-full font-light text-base tracking-wide hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {dict.hero.leaveDetails}
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
