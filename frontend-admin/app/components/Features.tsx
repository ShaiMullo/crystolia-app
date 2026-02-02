"use client";

import type { Locale } from "../../i18n/config";
import {
  Crown,
  Package,
  BadgePercent,
  Truck,
  ShieldCheck,
  Headset,
} from "lucide-react";

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

// Icons mapped to each feature index
const featureIcons = [
  Crown,        // Premium Quality - איכות פרימיום
  Package,      // Multiple Sizes - מגוון גדלים  
  BadgePercent, // Competitive Pricing - מחיר תחרותי
  Truck,        // Fast Service - שירות מהיר
  ShieldCheck,  // Proven Quality - איכות מוכחת
  Headset,      // Customer Service - שירות לקוחות
];

export default function Features({ locale, dict }: FeaturesProps) {
  const isRTL = locale === "he";

  // Colorful icon backgrounds for variety
  const iconColors = [
    { bg: "from-[#F5C542]/25 to-[#B8860B]/15", icon: "text-[#B8860B]", hover: "group-hover:from-[#F5C542]/40 group-hover:to-[#B8860B]/25" },
    { bg: "from-[#6B8E23]/25 to-[#9ACD32]/15", icon: "text-[#6B8E23]", hover: "group-hover:from-[#6B8E23]/40 group-hover:to-[#9ACD32]/25" },
    { bg: "from-[#B8860B]/25 to-[#D4A84B]/15", icon: "text-[#8B6914]", hover: "group-hover:from-[#B8860B]/40 group-hover:to-[#D4A84B]/25" },
    { bg: "from-[#5D4037]/20 to-[#8D6E63]/10", icon: "text-[#5D4037]", hover: "group-hover:from-[#5D4037]/35 group-hover:to-[#8D6E63]/20" },
    { bg: "from-[#FFBF00]/25 to-[#FFD700]/15", icon: "text-[#CC9900]", hover: "group-hover:from-[#FFBF00]/40 group-hover:to-[#FFD700]/25" },
    { bg: "from-[#3D2914]/20 to-[#5D4037]/10", icon: "text-[#3D2914]", hover: "group-hover:from-[#3D2914]/35 group-hover:to-[#5D4037]/20" },
  ];

  return (
    <section
      id="features"
      className="relative py-32 bg-gradient-to-b from-white via-[#FFF8E7]/30 to-white overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#F5C542]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#B8860B]/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6B8E23]/5 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-12 ${isRTL ? "rtl" : "ltr"
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
          {dict.features.items.map((feature, index) => {
            const IconComponent = featureIcons[index] || Crown;
            const colors = iconColors[index % iconColors.length];
            return (
              <div
                key={index}
                className="group relative p-8 rounded-3xl bg-white border-2 border-gray-100 hover:border-[#F5C542]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[#F5C542]/10 hover:-translate-y-3"
              >
                {/* Icon */}
                <div className={`w-18 h-18 mb-6 rounded-2xl bg-gradient-to-br ${colors.bg} ${colors.hover} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <IconComponent
                    className={`w-9 h-9 ${colors.icon} transition-colors duration-300`}
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="text-2xl font-medium text-[#3D2914] mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  {feature.description}
                </p>

                {/* Premium Hover Glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F5C542]/0 to-[#B8860B]/0 group-hover:from-[#F5C542]/5 group-hover:to-[#B8860B]/5 transition-all duration-500 pointer-events-none" />

                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#F5C542]/10 to-transparent rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
