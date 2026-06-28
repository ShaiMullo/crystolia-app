// ⚠️ LEGAL REVIEW RECOMMENDED — NOT LEGAL ADVICE.
// Reflects the site's current reality: one first-party functional cookie
// (cl_loc, SameSite=Lax, ~1 year, language choice), no analytics, no marketing,
// no third-party trackers, no localStorage/sessionStorage. The consent tool and
// "Privacy Preferences" control referenced here are planned (Compliance PR-5/6).
// "privacy@crystolia.com" is a PLACEHOLDER — confirm before publishing. This
// comment is NOT shown to users.
import type { Locale } from "../config";
import type { LegalPageContent } from "./legalTypes";

export const cookiesContent: Record<Locale, LegalPageContent> = {
  en: {
    metaTitle: "Cookie Policy | Crystolia",
    metaDescription:
      "The cookies Crystolia uses on this website, what each one does, the consent categories, and how preferences will be managed.",
    title: "Cookie Policy",
    lastUpdated: "2026-06-28",
    intro:
      "This Cookie Policy explains how this website uses cookies and similar technologies. Today the site uses only one functional cookie and runs no analytics or marketing trackers.",
    sections: [
      {
        heading: "What Are Cookies",
        paragraphs: [
          "Cookies are small text files placed on your device when you visit a website. They are widely used to make sites work, to remember preferences, and — on many sites, though not this one — to measure usage or show advertising.",
        ],
      },
      {
        heading: "Cookies We Use",
        paragraphs: [
          "This website sets a single first-party cookie:",
          "cl_loc — Functional. It remembers the language you chose so it is not overridden on your next visit. It is first-party, uses SameSite=Lax, is stored for about one year, and is set only after you actively choose a language. It contains no personal or tracking information.",
        ],
      },
      {
        heading: "Cookie Categories",
        paragraphs: [
          "To make choices clear, cookies are grouped into four standard categories:",
          "Essential — required for the website to function. Functional — remember your preferences (this is where cl_loc belongs). Analytics — measure how the site is used. Marketing — support advertising and personalized content.",
        ],
      },
      {
        heading: "Current State",
        paragraphs: [
          "At present we use only the Functional cookie described above. We do not use Analytics or Marketing cookies at all, and we do not use localStorage or sessionStorage to track you.",
        ],
      },
      {
        heading: "Managing Your Preferences",
        paragraphs: [
          "Because the only cookie we set is a functional language preference that you trigger yourself, there is currently nothing to opt out of. You can clear cookies at any time through your browser settings.",
          "When we introduce a consent tool, you will be able to review and change your choices at any time through a “Privacy Preferences” option.",
        ],
      },
      {
        heading: "Future Tracking and Consent",
        paragraphs: [
          "If we add analytics or marketing cookies in the future, we will ask for your consent first, those cookies will be off by default, and this policy will be updated to describe them.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "For questions about this Cookie Policy, contact us through the contact form on this website or by email at privacy@crystolia.com. See also our Privacy Policy.",
        ],
      },
    ],
  },

  he: {
    metaTitle: "מדיניות עוגיות | Crystolia",
    metaDescription:
      "אילו עוגיות Crystolia משתמשת בהן באתר, מה כל אחת עושה, קטגוריות ההסכמה וכיצד ינוהלו ההעדפות.",
    title: "מדיניות עוגיות",
    lastUpdated: "2026-06-28",
    intro:
      "מדיניות עוגיות זו מסבירה כיצד האתר משתמש בעוגיות ובטכנולוגיות דומות. כיום האתר משתמש בעוגייה תפקודית אחת בלבד ואינו מפעיל כלי אנליטיקה או שיווק.",
    sections: [
      {
        heading: "מהן עוגיות",
        paragraphs: [
          "עוגיות הן קבצי טקסט קטנים הנשמרים במכשירך בעת ביקור באתר. הן נפוצות מאוד ומשמשות להפעלת אתרים, לזכירת העדפות, ובאתרים רבים (אך לא כאן) גם למדידת שימוש או להצגת פרסום.",
        ],
      },
      {
        heading: "העוגיות שבהן אנו משתמשים",
        paragraphs: [
          "האתר קובע עוגייה ראשונית אחת בלבד:",
          "cl_loc — תפקודית. היא זוכרת את השפה שבחרת כדי שלא תידרס בביקור הבא. היא ראשונית, משתמשת ב‑SameSite=Lax, נשמרת לכשנה, ונקבעת רק לאחר שבחרת שפה באופן אקטיבי. היא אינה מכילה מידע אישי או מידע מעקב.",
        ],
      },
      {
        heading: "קטגוריות עוגיות",
        paragraphs: [
          "כדי שהבחירה תהיה ברורה, העוגיות מחולקות לארבע קטגוריות סטנדרטיות:",
          "חיוניות — נדרשות לתפקוד האתר. תפקודיות — זוכרות את העדפותיך (כאן שייכת cl_loc). אנליטיקה — מודדות כיצד נעשה שימוש באתר. שיווק — תומכות בפרסום ובתוכן מותאם אישית.",
        ],
      },
      {
        heading: "המצב הנוכחי",
        paragraphs: [
          "כיום אנו משתמשים אך ורק בעוגייה התפקודית שתוארה למעלה. איננו משתמשים כלל בעוגיות אנליטיקה או שיווק, ואיננו משתמשים ב‑localStorage או ב‑sessionStorage כדי לעקוב אחריך.",
        ],
      },
      {
        heading: "ניהול ההעדפות שלך",
        paragraphs: [
          "מאחר שהעוגייה היחידה שאנו קובעים היא העדפת שפה תפקודית שאתה עצמך מפעיל, אין כרגע ממה לבטל הסכמה. תוכל למחוק עוגיות בכל עת דרך הגדרות הדפדפן.",
          "כאשר נוסיף כלי הסכמה, תוכל לעיין ולשנות את בחירותיך בכל עת דרך אפשרות “העדפות פרטיות”.",
        ],
      },
      {
        heading: "מעקב עתידי והסכמה",
        paragraphs: [
          "אם נוסיף בעתיד עוגיות אנליטיקה או שיווק, נבקש תחילה את הסכמתך, עוגיות אלה יהיו כבויות כברירת מחדל, ומדיניות זו תעודכן כדי לתאר אותן.",
        ],
      },
      {
        heading: "יצירת קשר",
        paragraphs: [
          "לשאלות בנוגע למדיניות עוגיות זו, פנה אלינו דרך טופס הקשר באתר או בדוא“ל לכתובת privacy@crystolia.com. ראה גם את מדיניות הפרטיות שלנו.",
        ],
      },
    ],
  },

  ru: {
    metaTitle: "Политика использования файлов cookie | Crystolia",
    metaDescription:
      "Какие файлы cookie использует Crystolia на этом сайте, что делает каждый из них, категории согласия и как управлять настройками.",
    title: "Политика использования файлов cookie",
    lastUpdated: "2026-06-28",
    intro:
      "Эта Политика объясняет, как сайт использует файлы cookie и подобные технологии. Сегодня сайт использует только один функциональный cookie и не запускает аналитических или маркетинговых трекеров.",
    sections: [
      {
        heading: "Что такое файлы cookie",
        paragraphs: [
          "Файлы cookie — это небольшие текстовые файлы, сохраняемые на вашем устройстве при посещении сайта. Они широко используются для работы сайтов, запоминания настроек, а на многих сайтах (но не на этом) — для измерения использования или показа рекламы.",
        ],
      },
      {
        heading: "Используемые нами файлы cookie",
        paragraphs: [
          "Сайт устанавливает единственный собственный cookie:",
          "cl_loc — функциональный. Он запоминает выбранный вами язык, чтобы он не переопределялся при следующем визите. Он является собственным, использует SameSite=Lax, хранится около одного года и устанавливается только после того, как вы активно выбрали язык. Он не содержит персональной или отслеживающей информации.",
        ],
      },
      {
        heading: "Категории файлов cookie",
        paragraphs: [
          "Чтобы выбор был понятен, файлы cookie разделены на четыре стандартные категории:",
          "Необходимые — требуются для работы сайта. Функциональные — запоминают ваши настройки (к ним относится cl_loc). Аналитика — измеряют использование сайта. Маркетинг — поддерживают рекламу и персонализированный контент.",
        ],
      },
      {
        heading: "Текущее состояние",
        paragraphs: [
          "В настоящее время мы используем только функциональный cookie, описанный выше. Мы вообще не используем аналитические или маркетинговые cookie и не используем localStorage или sessionStorage для отслеживания.",
        ],
      },
      {
        heading: "Управление настройками",
        paragraphs: [
          "Поскольку единственный устанавливаемый нами cookie — это функциональная настройка языка, которую вы запускаете сами, отказываться сейчас не от чего. Вы можете в любой момент удалить файлы cookie в настройках браузера.",
          "Когда мы добавим инструмент согласия, вы сможете в любой момент просматривать и менять свой выбор через опцию «Настройки конфиденциальности».",
        ],
      },
      {
        heading: "Будущее отслеживание и согласие",
        paragraphs: [
          "Если в будущем мы добавим аналитические или маркетинговые cookie, мы сначала запросим ваше согласие, такие cookie будут отключены по умолчанию, а эта политика будет обновлена с их описанием.",
        ],
      },
      {
        heading: "Контакты",
        paragraphs: [
          "По вопросам этой Политики свяжитесь с нами через форму на сайте или по эл. почте privacy@crystolia.com. См. также нашу Политику конфиденциальности.",
        ],
      },
    ],
  },
};
