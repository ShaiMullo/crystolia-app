"use client";

import type { Locale } from "../i18n/config";

interface BrandProps {
  locale: Locale;
  dict: {
    brand: {
      title: string;
      content: string[];
    };
  };
}

export default function Brand({ locale, dict }: BrandProps) {
  const isRTL = locale === "he";

  return (
    <section
      id="brand"
      className="relative py-24 bg-gradient-to-b from-[#FFF8E7]/40 via-white to-white"
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="max-w-3xl mx-auto px-6 lg:px-12 text-center"
      >
        <h2 className="text-4xl md:text-5xl font-light tracking-tight text-[#3D2914] mb-6">
          {dict.brand.title}
        </h2>
        <div className="space-y-4">
          {dict.brand.content.map((paragraph, index) => (
            <p
              key={index}
              className="text-lg md:text-xl font-light text-gray-600 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
