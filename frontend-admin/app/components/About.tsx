"use client";

import Image from "next/image";
import type { Locale } from "../../i18n/config";

interface AboutProps {
  locale: Locale;
  dict: {
    about: {
      title: string;
      content: string[];
    };
  };
}

export default function About({ locale, dict }: AboutProps) {
  const isRTL = locale === "he";

  return (
    <section
      id="about"
      className="relative py-32 bg-gradient-to-b from-white to-gray-50/30"
    >
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-12 ${isRTL ? "rtl" : "ltr"}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div
            className={`space-y-8 ${
              isRTL ? "lg:text-right" : "lg:text-left"
            }`}
          >
            <h2 className="text-5xl md:text-6xl font-extralight tracking-tight text-gray-900">
              {dict.about.title}
            </h2>

            <div className="space-y-6">
              {dict.about.content.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-lg md:text-xl font-light text-gray-600 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Image Area */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              {/* Placeholder for product image */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F5C542]/10 to-[#F5C542]/5" />

              {/* You can replace this with actual product images */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-[#F5C542]/20 flex items-center justify-center">
                    <Image
                      src="/bottle-20l.png"
                      alt="Crystolia Product"
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm font-light text-gray-500">
                    Premium Quality
                  </p>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-[#F5C542]/10 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-[#F5C542]/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
