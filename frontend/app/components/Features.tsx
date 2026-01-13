"use client";

import type { Locale } from "../../i18n/config";

interface FeaturesProps {
  locale: Locale;
  dict: {
    features: {
      title: string;
      subtitle: string;
      items: Array<{
        title: string;
        description: string;
      }>;
    };
  };
}

export default function Features({ locale, dict }: FeaturesProps) {
  const isRTL = locale === "he";

  return (
    <section
      id="features"
      className="relative py-32 bg-white overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#F5C542] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#F5C542] rounded-full blur-3xl" />
      </div>

      <div
        className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 ${
          isRTL ? "rtl" : "ltr"
        }`}
      >
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-extralight tracking-tight text-gray-900 mb-4">
            {dict.features.title}
          </h2>
          <p className="text-xl font-light text-gray-600 max-w-2xl mx-auto">
            {dict.features.subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dict.features.items.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-3xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 hover:border-[#F5C542]/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
            >
              {/* Icon Placeholder - You can replace with actual icons */}
              <div className="w-14 h-14 mb-6 rounded-2xl bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <div className="w-8 h-8 bg-[#F5C542] rounded-lg opacity-60" />
              </div>

              <h3 className="text-2xl font-light text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 font-light leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F5C542]/0 to-[#F5C542]/0 group-hover:from-[#F5C542]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
