import type { Locale } from "./config";

// Product catalog — single source of truth for everything shown on the site.
//
// Business rules:
//  - Only Crystolia branded products are published. Other brands live in
//    public/products/other-brands/_future and must not be referenced here.
//  - Real sizes only: 0.9L and 5L. Do not add other sizes.
//  - No prices, ratings, reviews or certification claims.

export type OilType = "canola" | "sunflower";
export type ProductSize = "0.9L" | "5L";

export interface Product {
  id: string;
  brand: "Crystolia";
  oilType: OilType;
  size: ProductSize;
  /** Primary product image (front view) shown on cards and in schema. */
  image: string;
  /** Additional verified photos of this product (lifestyle / cooking). */
  gallery: string[];
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  alt: Record<Locale, string>;
}

const IMG = "/products/crystolia";

export const PRODUCTS: Product[] = [
  {
    id: "crystolia-canola-0-9l",
    brand: "Crystolia",
    oilType: "canola",
    size: "0.9L",
    image: `${IMG}/canola/crystolia-canola-0.9l-front.jpeg`,
    gallery: [
      `${IMG}/canola/crystolia-canola-0.9l-lifestyle.jpeg`,
      `${IMG}/canola/crystolia-canola-0.9l-cooking.jpeg`,
    ],
    name: {
      en: "Crystolia Canola Oil 0.9L",
      he: "שמן קנולה קריסטוליה 0.9 ליטר",
      ru: "Рапсовое масло Crystolia 0.9 л",
    },
    description: {
      en: "Refined canola oil with a light, neutral taste — ideal for everyday cooking, light frying and baking. Compact 0.9L bottle for the home kitchen.",
      he: "שמן קנולה מזוכך בטעם עדין — מושלם לבישול יומיומי, לטיגון קל ולאפייה. בקבוק 0.9 ליטר נוח למטבח הביתי.",
      ru: "Рафинированное рапсовое масло с мягким нейтральным вкусом — для повседневной готовки, лёгкой жарки и выпечки. Удобная бутылка 0.9 л.",
    },
    alt: {
      en: "Crystolia canola oil 0.9L bottle, front view",
      he: "בקבוק שמן קנולה קריסטוליה 0.9 ליטר — מבט קדמי",
      ru: "Бутылка рапсового масла Crystolia 0.9 л — вид спереди",
    },
  },
  {
    id: "crystolia-canola-5l",
    brand: "Crystolia",
    oilType: "canola",
    size: "5L",
    image: `${IMG}/canola/crystolia-canola5L.jpg`,
    gallery: [],
    name: {
      en: "Crystolia Canola Oil 5L",
      he: "שמן קנולה קריסטוליה 5 ליטר",
      ru: "Рапсовое масло Crystolia 5 л",
    },
    description: {
      en: "Large-format refined canola oil for restaurants, catering and large households — the same Crystolia quality in a 5L container.",
      he: "אריזת 5 ליטר של שמן קנולה קריסטוליה — למסעדות, לקייטרינג ולמשקי בית גדולים, באותה איכות מוקפדת.",
      ru: "Рапсовое масло Crystolia в формате 5 л — для ресторанов, кейтеринга и больших семей.",
    },
    alt: {
      en: "Crystolia canola oil 5L bottle, front view",
      he: "בקבוק שמן קנולה קריסטוליה 5 ליטר — מבט קדמי",
      ru: "Бутылка рапсового масла Crystolia 5 л — вид спереди",
    },
  },
  {
    id: "crystolia-sunflower-0-9l",
    brand: "Crystolia",
    oilType: "sunflower",
    size: "0.9L",
    image: `${IMG}/sunflower/crystolia-sunflower-0.9l-front.jpeg`,
    gallery: [
      `${IMG}/sunflower/crystolia-sunflower-0.9l-lifestyle.jpeg`,
      `${IMG}/sunflower/crystolia-sunflower-0.9l-cooking.jpeg`,
    ],
    name: {
      en: "Crystolia Sunflower Oil 0.9L",
      he: "שמן חמניות קריסטוליה 0.9 ליטר",
      ru: "Подсолнечное масло Crystolia 0.9 л",
    },
    description: {
      en: "Pure refined sunflower oil in a compact 0.9L bottle — perfect for everyday cooking and frying at home.",
      he: "שמן חמניות מזוכך וטהור בבקבוק 0.9 ליטר — לשימוש יומיומי במטבח, לבישול ולטיגון.",
      ru: "Чистое рафинированное подсолнечное масло в бутылке 0.9 л — для повседневной готовки и жарки.",
    },
    alt: {
      en: "Crystolia sunflower oil 0.9L bottle, front view",
      he: "בקבוק שמן חמניות קריסטוליה 0.9 ליטר — מבט קדמי",
      ru: "Бутылка подсолнечного масла Crystolia 0.9 л — вид спереди",
    },
  },
  {
    id: "crystolia-sunflower-5l",
    brand: "Crystolia",
    oilType: "sunflower",
    size: "5L",
    image: `${IMG}/sunflower/crystolia-sunflower-5l-front.jpeg`,
    gallery: [`${IMG}/sunflower/crystolia-sunflower-0.9l-and-5l.jpeg`],
    name: {
      en: "Crystolia Sunflower Oil 5L",
      he: "שמן חמניות קריסטוליה 5 ליטר",
      ru: "Подсолнечное масло Crystolia 5 л",
    },
    description: {
      en: "Premium sunflower oil in a 5L container — sized for regular daily use at home and in professional kitchens.",
      he: "אריזת 5 ליטר של שמן חמניות קריסטוליה באיכות פרימיום — חיסכון לצריכה שוטפת בבית ובמטבח המקצועי.",
      ru: "Подсолнечное масло Crystolia премиум-качества в формате 5 л — выгодно при регулярном использовании дома и на профессиональной кухне.",
    },
    alt: {
      en: "Crystolia sunflower oil 5L bottle, front view",
      he: "בקבוק שמן חמניות קריסטוליה 5 ליטר — מבט קדמי",
      ru: "Бутылка подсолнечного масла Crystolia 5 л — вид спереди",
    },
  },
];

// Localized labels for the two product lines, used for grouping on the
// homepage and as titles on the dedicated /canola-oil and /sunflower-oil pages.
export const OIL_TYPE_LABELS: Record<OilType, Record<Locale, string>> = {
  canola: {
    en: "Crystolia Canola Oil",
    he: "שמן קנולה קריסטוליה",
    ru: "Рапсовое масло Crystolia",
  },
  sunflower: {
    en: "Crystolia Sunflower Oil",
    he: "שמן חמניות קריסטוליה",
    ru: "Подсолнечное масло Crystolia",
  },
};

export const getProductsByOilType = (oilType: OilType): Product[] =>
  PRODUCTS.filter((p) => p.oilType === oilType);
