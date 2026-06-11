import type { Locale } from "../config";
import type { OilType } from "../products";

// Localized content for the dedicated product-line pages:
// /{locale}/canola-oil and /{locale}/sunflower-oil.
// Factual copy only — no prices, health claims or certifications.

export interface OilPageSection {
  heading: string;
  paragraphs: string[];
}

export interface OilPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  sections: OilPageSection[];
  whatsappCta: string;
}

export const oilPagesContent: Record<OilType, Record<Locale, OilPageContent>> = {
  canola: {
    en: {
      metaTitle: "Crystolia Canola Oil | Refined Canola Oil 0.9L & 5L",
      metaDescription:
        "Crystolia Canola Oil — refined canola oil with a light, neutral taste, in 0.9L bottles for home kitchens and 5L containers for restaurants and catering.",
      title: "Crystolia Canola Oil",
      intro:
        "Crystolia canola oil is a refined cooking oil with a light, neutral taste. It comes in two sizes: a 0.9L bottle for the home kitchen and a 5L container for restaurants, catering businesses and large households.",
      sections: [
        {
          heading: "A Versatile Everyday Oil",
          paragraphs: [
            "The neutral profile of canola oil makes it a versatile choice for everyday cooking: light frying, sautéing, baking, sauces and salad dressings — anywhere the oil should support the dish rather than dominate it.",
            "Crystolia canola oil is imported and distributed under consistent quality control, so the product you pour today matches the one you poured last month, batch after batch.",
          ],
        },
        {
          heading: "For Businesses and Professional Kitchens",
          paragraphs: [
            "Restaurants, catering operations and retailers rely on the 5L format of Crystolia canola oil for steady daily use, with reliable supply and a fair price.",
          ],
        },
      ],
      whatsappCta: "Ask about Crystolia canola oil on WhatsApp",
    },
    he: {
      metaTitle: "שמן קנולה קריסטוליה | שמן קנולה מזוכך 0.9 ו-5 ליטר",
      metaDescription:
        "שמן קנולה קריסטוליה — שמן קנולה מזוכך בטעם עדין ונייטרלי, בבקבוק 0.9 ליטר למטבח הביתי ובאריזת 5 ליטר למסעדות ולקייטרינג.",
      title: "שמן קנולה קריסטוליה",
      intro:
        "שמן קנולה קריסטוליה הוא שמן מאכל מזוכך בטעם עדין ונייטרלי. השמן זמין בשני גדלים: בקבוק 0.9 ליטר למטבח הביתי ואריזת 5 ליטר למסעדות, לקייטרינג ולמשקי בית גדולים.",
      sections: [
        {
          heading: "שמן רב-תכליתי לכל יום",
          paragraphs: [
            "הטעם הנייטרלי של שמן הקנולה הופך אותו לבחירה רב-תכליתית לבישול יומיומי: טיגון קל, הקפצה, אפייה, רטבים וסלטים — בכל מקום שבו השמן צריך ללוות את המנה ולא להשתלט עליה.",
            "שמן קריסטוליה מיובא ומופץ תחת בקרת איכות עקבית, כך שהמוצר שתקבלו היום זהה לזה שקיבלתם בחודש שעבר — אצווה אחרי אצווה.",
          ],
        },
        {
          heading: "לעסקים ולמטבח המקצועי",
          paragraphs: [
            "מסעדות, קייטרינג וחנויות נשענים על אריזות 5 הליטר של שמן קנולה קריסטוליה לשימוש שוטף, עם אספקה אמינה ומחיר הוגן.",
          ],
        },
      ],
      whatsappCta: "לפרטים על שמן קנולה קריסטוליה בוואטסאפ",
    },
    ru: {
      metaTitle: "Рапсовое масло Crystolia | Рафинированное масло 0.9 л и 5 л",
      metaDescription:
        "Рапсовое масло Crystolia — рафинированное масло с мягким нейтральным вкусом, в бутылках 0.9 л для дома и канистрах 5 л для ресторанов и кейтеринга.",
      title: "Рапсовое масло Crystolia",
      intro:
        "Рапсовое масло Crystolia — рафинированное пищевое масло с мягким нейтральным вкусом. Доступно в двух форматах: бутылка 0.9 л для домашней кухни и упаковка 5 л для ресторанов, кейтеринга и больших семей.",
      sections: [
        {
          heading: "Универсальное масло на каждый день",
          paragraphs: [
            "Нейтральный вкус рапсового масла делает его универсальным выбором для повседневной готовки: лёгкая жарка, тушение, выпечка, соусы и заправки — везде, где масло должно дополнять блюдо, а не доминировать.",
            "Масло Crystolia импортируется и поставляется под постоянным контролем качества: продукт одинаков от партии к партии.",
          ],
        },
        {
          heading: "Для бизнеса и профессиональной кухни",
          paragraphs: [
            "Рестораны, кейтеринг и магазины выбирают формат 5 л рапсового масла Crystolia для ежедневного использования — с надёжными поставками и честной ценой.",
          ],
        },
      ],
      whatsappCta: "Узнать о рапсовом масле Crystolia в WhatsApp",
    },
  },
  sunflower: {
    en: {
      metaTitle: "Crystolia Sunflower Oil | Refined Sunflower Oil 0.9L & 5L",
      metaDescription:
        "Crystolia Sunflower Oil — pure refined sunflower oil with a mild flavor and golden color, in 0.9L bottles for home kitchens and 5L containers for restaurants and catering.",
      title: "Crystolia Sunflower Oil",
      intro:
        "Crystolia sunflower oil is a pure, refined sunflower oil with a mild flavor and golden color. It comes in two sizes: a 0.9L bottle for the home kitchen and a 5L container for restaurants, catering businesses and large households.",
      sections: [
        {
          heading: "A Staple for Every Kitchen",
          paragraphs: [
            "Crystolia sunflower oil performs well at typical frying temperatures, making it a staple for schnitzel, fried vegetables, baking and general kitchen use.",
            "It is imported and distributed under consistent quality control, with the same specification from batch to batch.",
          ],
        },
        {
          heading: "For Businesses and Professional Kitchens",
          paragraphs: [
            "The 5L format of Crystolia sunflower oil fits the pace and volume of professional kitchens — restaurants, catering operations and institutional kitchens — with reliable supply and a fair price.",
          ],
        },
      ],
      whatsappCta: "Ask about Crystolia sunflower oil on WhatsApp",
    },
    he: {
      metaTitle: "שמן חמניות קריסטוליה | שמן חמניות מזוכך 0.9 ו-5 ליטר",
      metaDescription:
        "שמן חמניות קריסטוליה — שמן חמניות מזוכך וטהור בטעם עדין ובצבע זהוב, בבקבוק 0.9 ליטר למטבח הביתי ובאריזת 5 ליטר למסעדות ולקייטרינג.",
      title: "שמן חמניות קריסטוליה",
      intro:
        "שמן חמניות קריסטוליה הוא שמן חמניות מזוכך וטהור, בטעם עדין ובצבע זהוב. השמן זמין בשני גדלים: בקבוק 0.9 ליטר למטבח הביתי ואריזת 5 ליטר למסעדות, לקייטרינג ולמשקי בית גדולים.",
      sections: [
        {
          heading: "שמן בסיס לכל מטבח",
          paragraphs: [
            "שמן החמניות של קריסטוליה מתפקד היטב בטמפרטורות טיגון רגילות — שניצלים, ירקות מטוגנים, אפייה ושימוש כללי במטבח.",
            "השמן מיובא ומופץ תחת בקרת איכות עקבית, עם מפרט אחיד מאצווה לאצווה.",
          ],
        },
        {
          heading: "לעסקים ולמטבח המקצועי",
          paragraphs: [
            "אריזת 5 הליטר של שמן חמניות קריסטוליה מותאמת לקצב ולנפח של המטבח המקצועי — מסעדות, קייטרינג ומטבחים מוסדיים — עם אספקה אמינה ומחיר הוגן.",
          ],
        },
      ],
      whatsappCta: "לפרטים על שמן חמניות קריסטוליה בוואטסאפ",
    },
    ru: {
      metaTitle: "Подсолнечное масло Crystolia | Рафинированное масло 0.9 л и 5 л",
      metaDescription:
        "Подсолнечное масло Crystolia — чистое рафинированное масло с мягким вкусом и золотистым цветом, в бутылках 0.9 л и канистрах 5 л для дома, ресторанов и кейтеринга.",
      title: "Подсолнечное масло Crystolia",
      intro:
        "Подсолнечное масло Crystolia — чистое рафинированное масло с мягким вкусом и золотистым цветом. Доступно в двух форматах: бутылка 0.9 л для домашней кухни и упаковка 5 л для ресторанов, кейтеринга и больших семей.",
      sections: [
        {
          heading: "Базовое масло для любой кухни",
          paragraphs: [
            "Подсолнечное масло Crystolia хорошо ведёт себя при обычных температурах жарки — шницели, жареные овощи, выпечка и повседневное использование на кухне.",
            "Масло импортируется и поставляется под постоянным контролем качества, со стабильными характеристиками от партии к партии.",
          ],
        },
        {
          heading: "Для бизнеса и профессиональной кухни",
          paragraphs: [
            "Формат 5 л подсолнечного масла Crystolia рассчитан на темп и объёмы профессиональной кухни — рестораны, кейтеринг и столовые — с надёжными поставками и честной ценой.",
          ],
        },
      ],
      whatsappCta: "Узнать о подсолнечном масле Crystolia в WhatsApp",
    },
  },
};
