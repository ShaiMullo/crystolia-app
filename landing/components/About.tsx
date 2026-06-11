"use client";

import Image from "next/image";
import type { Locale } from "../i18n/config";

interface AboutProps {
  locale: Locale;
  dict: {
    about: {
      title: string;
      imageCaption: string;
      imageAlt: string;
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
        dir={isRTL ? "rtl" : "ltr"}
        className="max-w-7xl mx-auto px-6 lg:px-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8 lg:text-start">
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

          {/* Image Area — real photo of both Crystolia sunflower bottles
              (0.9L + 5L), shown in full with object-contain */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#FFFDF5] to-[#FFF8E7] p-8">
              <Image
                src="/products/crystolia/sunflower/crystolia-sunflower-0.9l-and-5l.jpeg"
                alt={dict.about.imageAlt}
                width={1067}
                height={1600}
                className="relative z-10 w-auto h-auto max-h-[540px] mx-auto object-contain rounded-2xl"
              />
              <p className="relative z-10 mt-5 text-center text-sm font-light text-gray-500">
                {dict.about.imageCaption}
              </p>

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
