"use client";

import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../i18n/config";
import {
  OIL_TYPE_LABELS,
  getProductsByOilType,
  type OilType,
} from "../i18n/products";

interface ProductsProps {
  locale: Locale;
  dict: {
    products: {
      title: string;
      subtitle: string;
      badge: string;
      whatsappMessage: string;
      cta: string;
      learnMore: string;
    };
  };
}

const OIL_TYPES: OilType[] = ["canola", "sunflower"];

const accentColors: Record<OilType, string> = {
  canola: "from-[#6BBF59] to-[#4A9E3D]",
  sunflower: "from-[#F5C542] to-[#E6B800]",
};

export default function Products({ locale, dict }: ProductsProps) {
  const isRTL = locale === "he";

  const handleWhatsApp = () => {
    const phone = "972546970555";
    const message = encodeURIComponent(dict.products.whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <section
      id="products"
      className="relative py-32 bg-gradient-to-b from-[#FFF8E7]/50 via-white to-[#FFF8E7]/30"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent" />

      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12"
      >
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-[#F5C542]/20 to-[#B8860B]/20 text-[#B8860B] text-sm font-medium tracking-wider uppercase mb-4">
            {dict.products.badge}
          </span>
          <h2 className="text-5xl md:text-6xl font-light tracking-tight text-[#3D2914] mb-4">
            {dict.products.title}
          </h2>
          <p className="text-xl font-light text-gray-600 max-w-2xl mx-auto">
            {dict.products.subtitle}
          </p>
        </div>

        {/* One group per oil type: canola, then sunflower */}
        {OIL_TYPES.map((oilType) => (
          <div key={oilType} className="mb-20 last:mb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
              <h3 className="text-2xl md:text-3xl font-semibold text-[#3D2914]">
                <span
                  className={`inline-block w-3 h-3 rounded-full bg-gradient-to-r ${accentColors[oilType]} ${
                    isRTL ? "ml-3" : "mr-3"
                  }`}
                />
                {OIL_TYPE_LABELS[oilType][locale]}
              </h3>
              <Link
                href={`/${locale}/${oilType}-oil`}
                className="text-sm font-medium text-[#B8860B] hover:text-[#3D2914] transition-colors"
              >
                {dict.products.learnMore} {isRTL ? "←" : "→"}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
              {getProductsByOilType(oilType).map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-[#F5C542]/15 transition-all duration-500 hover:-translate-y-2 border-2 border-[#F5C542]/10 hover:border-[#F5C542]/40 flex flex-col sm:flex-row overflow-hidden"
                >
                  {/* Image Side — real packshot, always shown in full
                      (object-contain, never cropped: cap to base) */}
                  <div className="relative w-full sm:w-2/5 h-[300px] sm:h-auto sm:min-h-[320px] bg-gradient-to-br from-[#FFFDF5] to-[#FFF8E7]">
                    <div className="absolute inset-5">
                      <Image
                        src={product.image}
                        alt={product.alt[locale]}
                        fill
                        className="object-contain object-center transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 280px"
                      />
                    </div>
                    <div
                      className={`absolute top-4 ${
                        isRTL ? "left-4" : "right-4"
                      } px-3 py-1 bg-[#3D2914]/90 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-md`}
                    >
                      {product.size}
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-[#3D2914] mb-3">
                        {product.name[locale]}
                      </h4>
                      <p className="text-gray-600 font-light leading-relaxed text-sm">
                        {product.description[locale]}
                      </p>
                    </div>

                    <button
                      onClick={handleWhatsApp}
                      className="mt-6 w-full px-5 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-full font-medium text-sm tracking-wide hover:from-[#25D366] hover:to-[#25D366] transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      {dict.products.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
