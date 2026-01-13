"use client";

import Image from "next/image";
import type { Locale } from "../../i18n/config";

interface ProductsProps {
  locale: Locale;
  dict: {
    products: {
      title: string;
      subtitle: string;
      items: Array<{
        title: string;
        description: string;
        whatsapp: string;
      }>;
    };
  };
}

export default function Products({ locale, dict }: ProductsProps) {
  const isRTL = locale === "he";

  const products = [
    {
      image: "/bottle-5l.png",
      size: "5L",
    },
    {
      image: "/bottle-10l.png",
      size: "10L",
    },
    {
      image: "/bottle-20l.png",
      size: "20L",
    },
  ];

  const handleWhatsApp = (index: number) => {
    const phone = "972501234567"; // Replace with actual WhatsApp number
    const productData = dict.products.items[index];
    const message = encodeURIComponent(productData.whatsapp);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <section
      id="products"
      className="relative py-32 bg-gradient-to-b from-white to-gray-50/30"
    >
      <div
        className={`max-w-7xl mx-auto px-6 lg:px-12 ${
          isRTL ? "rtl" : "ltr"
        }`}
      >
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-extralight tracking-tight text-gray-900 mb-4">
            {dict.products.title}
          </h2>
          <p className="text-xl font-light text-gray-600 max-w-2xl mx-auto">
            {dict.products.subtitle}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {products.map((product, index) => {
            const productData = dict.products.items[index];
            return (
              <div
                key={product.size}
                className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100"
              >
                {/* Product Image */}
                <div className="relative h-64 mb-6 flex items-center justify-center">
                  <div className="relative w-full h-full max-w-[200px] mx-auto">
                    <Image
                      src={product.image}
                      alt={productData.title}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-light text-gray-900">
                    {productData.title}
                  </h3>
                  <p className="text-gray-600 font-light leading-relaxed min-h-[60px]">
                    {productData.description}
                  </p>

                  {/* WhatsApp CTA Button */}
                  <button
                    onClick={() => handleWhatsApp(index)}
                    className="w-full mt-6 px-6 py-3 bg-[#25D366] text-white rounded-full font-light text-sm tracking-wide hover:bg-[#25D366]/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    {productData.whatsapp}
                  </button>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F5C542]/0 to-[#F5C542]/0 group-hover:from-[#F5C542]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

