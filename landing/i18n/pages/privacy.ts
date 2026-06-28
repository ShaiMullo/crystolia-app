// ⚠️ LEGAL REVIEW RECOMMENDED — NOT LEGAL ADVICE.
// Professional, production-ready boilerplate that reflects the site's current
// reality (informational B2B site, first-party lead form -> /api/leads, one
// functional cookie cl_loc, no analytics/marketing/third-party trackers today).
// Have counsel review before relying on it. The "privacy@crystolia.com" address
// and the legal-entity name are PLACEHOLDERS — confirm the official privacy
// contact and registered entity before publishing. This comment is NOT shown to
// users.
import type { Locale } from "../config";
import type { LegalPageContent } from "./legalTypes";

export const privacyContent: Record<Locale, LegalPageContent> = {
  en: {
    metaTitle: "Privacy Policy | Crystolia",
    metaDescription:
      "How Crystolia collects, uses and protects personal data submitted through this website's contact form, including cookies and your privacy rights.",
    title: "Privacy Policy",
    lastUpdated: "2026-06-28",
    intro:
      "This Privacy Policy explains how Crystolia (“we”, “us”) handles personal information in connection with this website. This is an informational, business-to-business website for our canola and sunflower oil products; it does not sell products online.",
    sections: [
      {
        heading: "Who We Are",
        paragraphs: [
          "Crystolia is a food-oil brand that presents its canola and sunflower oil products to businesses and private customers. This website is used to share product information and to receive inquiries.",
          "If you have questions about this policy or your personal data, you can contact us through the contact form on this website or using the details in the “Contact” section below.",
        ],
      },
      {
        heading: "Information We Collect",
        paragraphs: [
          "We only collect the information you choose to provide through our contact / inquiry form. This typically includes your name and phone number and, where you choose to provide them, your email address, business name, requested product or quantity, and any message you write.",
          "We do not require you to create an account, and we do not knowingly collect special categories of personal data through this website.",
        ],
      },
      {
        heading: "Why We Use Your Information",
        paragraphs: [
          "We use the details you submit solely to respond to your inquiry — for example, to answer questions, provide product information, or prepare a quote.",
          "Our legal basis is our legitimate interest in responding to business inquiries and, where applicable, the consent you give by choosing to submit the form.",
        ],
      },
      {
        heading: "How Your Inquiry Is Handled",
        paragraphs: [
          "When you submit the contact form, the information is sent to our own systems (a first-party endpoint, /api/leads) so our team can follow up. We do not sell your information and we do not use it for advertising.",
          "If you choose to contact us through the WhatsApp link on the site, that conversation takes place on WhatsApp and is also subject to WhatsApp’s own privacy policy.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "This website uses a single first-party functional cookie, cl_loc, which remembers your chosen language so your choice is not overridden. It is set only after you actively select a language, uses SameSite=Lax, and lasts about one year.",
          "We do not use analytics or marketing cookies today. For full details, please see our Cookie Policy.",
        ],
      },
      {
        heading: "Third Parties",
        paragraphs: [
          "We do not embed third-party advertising or analytics trackers on this website. We rely on standard hosting and infrastructure providers to operate the site and to receive form submissions, and these providers process data only on our behalf.",
          "WhatsApp is involved only if you choose to start a chat using the link we provide.",
        ],
      },
      {
        heading: "Data Retention",
        paragraphs: [
          "We keep the information from your inquiry only for as long as needed to handle your request and for a reasonable period afterwards, or as required by applicable law, after which it is deleted or anonymized.",
        ],
      },
      {
        heading: "Your Rights",
        paragraphs: [
          "Depending on where you live, you may have the right to access, correct, delete, restrict or object to the processing of your personal data, and the right to data portability. Residents of the EU/EEA have these rights under the GDPR; residents of Israel have rights under the Protection of Privacy Law.",
          "To exercise any of these rights, please contact us using the details below. You may also have the right to lodge a complaint with your local data protection authority.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "You can reach us through the contact form on this website, or by email at privacy@crystolia.com.",
        ],
      },
      {
        heading: "Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. The “Last updated” date above shows when it was last revised, and material changes will be reflected on this page.",
        ],
      },
    ],
  },

  he: {
    metaTitle: "מדיניות פרטיות | Crystolia",
    metaDescription:
      "כיצד Crystolia אוספת, משתמשת ומגינה על מידע אישי שנמסר דרך טופס הקשר באתר, לרבות עוגיות וזכויותיך.",
    title: "מדיניות פרטיות",
    lastUpdated: "2026-06-28",
    intro:
      "מדיניות פרטיות זו מסבירה כיצד Crystolia (“אנו”) מטפלת במידע אישי בהקשר לאתר זה. זהו אתר מידע עסקי למוצרי שמן הקנולה והחמניות שלנו; האתר אינו מוכר מוצרים באופן מקוון.",
    sections: [
      {
        heading: "מי אנחנו",
        paragraphs: [
          "Crystolia היא מותג שמני מאכל המציג את מוצרי שמן הקנולה והחמניות שלו לעסקים וללקוחות פרטיים. האתר משמש לשיתוף מידע על המוצרים ולקבלת פניות.",
          "לשאלות בנוגע למדיניות זו או למידע האישי שלך, ניתן לפנות אלינו דרך טופס הקשר באתר או באמצעות הפרטים שבסעיף “יצירת קשר” למטה.",
        ],
      },
      {
        heading: "אילו פרטים אנו אוספים",
        paragraphs: [
          "אנו אוספים רק את המידע שאתה בוחר למסור דרך טופס הקשר / הפניה. בדרך כלל מדובר בשם ובמספר טלפון, וכאשר תבחר למסור — גם כתובת דוא“ל, שם עסק, מוצר או כמות מבוקשת וכל הודעה שתכתוב.",
          "איננו מחייבים פתיחת חשבון, ואיננו אוספים באופן מודע סוגים מיוחדים של מידע אישי דרך האתר.",
        ],
      },
      {
        heading: "למה אנו משתמשים במידע",
        paragraphs: [
          "אנו משתמשים בפרטים שמסרת אך ורק כדי להשיב לפנייתך — למשל, למענה על שאלות, למתן מידע על מוצרים או להכנת הצעת מחיר.",
          "הבסיס החוקי הוא האינטרס הלגיטימי שלנו להשיב לפניות עסקיות, ובמקרה הרלוונטי — הסכמתך הניתנת בעת מסירת הטופס.",
        ],
      },
      {
        heading: "כיצד מטופלת פנייתך",
        paragraphs: [
          "בעת מסירת טופס הקשר, המידע נשלח למערכות שלנו (נקודת קצה ראשונית, /api/leads) כדי שנוכל לחזור אליך. איננו מוכרים את המידע ואיננו משתמשים בו לפרסום.",
          "אם תבחר לפנות אלינו דרך קישור ה‑WhatsApp באתר, השיחה מתקיימת ב‑WhatsApp וכפופה גם למדיניות הפרטיות של WhatsApp.",
        ],
      },
      {
        heading: "עוגיות (Cookies)",
        paragraphs: [
          "האתר משתמש בעוגייה תפקודית אחת בלבד (ראשונית), cl_loc, הזוכרת את שפת התצוגה שבחרת כדי שלא תידרס. היא נקבעת רק לאחר שבחרת שפה באופן אקטיבי, משתמשת ב‑SameSite=Lax ותקפה לכשנה.",
          "איננו משתמשים כיום בעוגיות אנליטיקה או שיווק. לפרטים מלאים ראה את מדיניות העוגיות שלנו.",
        ],
      },
      {
        heading: "צדדים שלישיים",
        paragraphs: [
          "איננו משבצים באתר כלי פרסום או מעקב (אנליטיקה) של צד שלישי. אנו נעזרים בספקי אחסון ותשתית סטנדרטיים להפעלת האתר ולקבלת פניות, המעבדים מידע עבורנו בלבד.",
          "WhatsApp מעורב רק אם תבחר לפתוח שיחה באמצעות הקישור שאנו מספקים.",
        ],
      },
      {
        heading: "שמירת מידע",
        paragraphs: [
          "אנו שומרים את המידע מפנייתך רק למשך הזמן הדרוש לטיפול בבקשה ולתקופה סבירה לאחר מכן, או כנדרש על פי דין, ולאחר מכן הוא נמחק או הופך אנונימי.",
        ],
      },
      {
        heading: "הזכויות שלך",
        paragraphs: [
          "בהתאם למקום מגוריך, ייתכן שתעמוד לך הזכות לעיין, לתקן, למחוק, להגביל או להתנגד לעיבוד המידע האישי שלך, והזכות לניידות מידע. לתושבי ה‑EU/EEA עומדות זכויות אלה מכוח ה‑GDPR; לתושבי ישראל עומדות זכויות מכוח חוק הגנת הפרטיות.",
          "למימוש זכויות אלה, נא לפנות אלינו באמצעות הפרטים למטה. כן ייתכן שתעמוד לך הזכות להגיש תלונה לרשות הרלוונטית להגנת הפרטיות באזורך.",
        ],
      },
      {
        heading: "יצירת קשר",
        paragraphs: [
          "ניתן ליצור איתנו קשר דרך טופס הקשר באתר, או בדוא“ל לכתובת privacy@crystolia.com.",
        ],
      },
      {
        heading: "שינויים במדיניות זו",
        paragraphs: [
          "אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. תאריך “עודכן לאחרונה” למעלה מציין מתי עודכנה לאחרונה, ושינויים מהותיים ישתקפו בדף זה.",
        ],
      },
    ],
  },

  ru: {
    metaTitle: "Политика конфиденциальности | Crystolia",
    metaDescription:
      "Как Crystolia собирает, использует и защищает персональные данные, отправленные через форму обратной связи, включая файлы cookie и ваши права.",
    title: "Политика конфиденциальности",
    lastUpdated: "2026-06-28",
    intro:
      "Эта Политика конфиденциальности объясняет, как Crystolia («мы») обрабатывает персональную информацию в связи с этим сайтом. Это информационный сайт для бизнеса, посвящённый нашим продуктам — рапсовому и подсолнечному маслу; он не продаёт товары онлайн.",
    sections: [
      {
        heading: "Кто мы",
        paragraphs: [
          "Crystolia — это бренд пищевых масел, представляющий рапсовое и подсолнечное масло бизнесу и частным клиентам. Сайт служит для предоставления информации о продуктах и приёма обращений.",
          "Если у вас есть вопросы по этой политике или вашим данным, свяжитесь с нами через форму на сайте или по контактам в разделе «Контакты» ниже.",
        ],
      },
      {
        heading: "Какую информацию мы собираем",
        paragraphs: [
          "Мы собираем только ту информацию, которую вы сами решаете предоставить через форму обратной связи. Обычно это имя и номер телефона, а при желании — также адрес эл. почты, название компании, нужный продукт или количество и текст сообщения.",
          "Мы не требуем создания учётной записи и не собираем особые категории персональных данных через этот сайт.",
        ],
      },
      {
        heading: "Зачем мы используем данные",
        paragraphs: [
          "Мы используем предоставленные данные исключительно для ответа на ваше обращение — например, чтобы ответить на вопросы, предоставить информацию о продукте или подготовить коммерческое предложение.",
          "Правовое основание — наш законный интерес в ответе на деловые обращения и, где применимо, ваше согласие, выраженное при отправке формы.",
        ],
      },
      {
        heading: "Как обрабатывается ваше обращение",
        paragraphs: [
          "При отправке формы данные передаются в наши собственные системы (собственная конечная точка, /api/leads), чтобы наша команда могла с вами связаться. Мы не продаём данные и не используем их для рекламы.",
          "Если вы решите написать нам через ссылку WhatsApp, разговор происходит в WhatsApp и также регулируется политикой конфиденциальности WhatsApp.",
        ],
      },
      {
        heading: "Файлы cookie",
        paragraphs: [
          "Сайт использует единственный собственный функциональный cookie — cl_loc, который запоминает выбранный язык, чтобы не переопределять ваш выбор. Он устанавливается только после того, как вы активно выбрали язык, использует SameSite=Lax и действует около одного года.",
          "Сегодня мы не используем аналитические или маркетинговые cookie. Подробности см. в Политике использования cookie.",
        ],
      },
      {
        heading: "Третьи стороны",
        paragraphs: [
          "Мы не встраиваем на сайте рекламные или аналитические трекеры третьих сторон. Мы используем стандартных поставщиков хостинга и инфраструктуры, которые обрабатывают данные только по нашему поручению.",
          "WhatsApp задействован только если вы сами начинаете чат по предоставленной ссылке.",
        ],
      },
      {
        heading: "Срок хранения",
        paragraphs: [
          "Мы храним данные вашего обращения только столько, сколько необходимо для обработки запроса и в течение разумного периода после этого либо согласно требованиям закона, после чего они удаляются или обезличиваются.",
        ],
      },
      {
        heading: "Ваши права",
        paragraphs: [
          "В зависимости от страны проживания у вас может быть право на доступ, исправление, удаление, ограничение или возражение против обработки ваших данных, а также на переносимость данных. Для жителей ЕС/ЕЭЗ эти права предусмотрены GDPR; для жителей Израиля — Законом о защите неприкосновенности частной жизни.",
          "Чтобы воспользоваться этими правами, свяжитесь с нами по контактам ниже. Вы также можете иметь право подать жалобу в местный орган по защите данных.",
        ],
      },
      {
        heading: "Контакты",
        paragraphs: [
          "Связаться с нами можно через форму обратной связи на сайте или по эл. почте privacy@crystolia.com.",
        ],
      },
      {
        heading: "Изменения этой политики",
        paragraphs: [
          "Мы можем время от времени обновлять эту политику. Дата «Последнее обновление» выше показывает, когда она была пересмотрена, а существенные изменения будут отражены на этой странице.",
        ],
      },
    ],
  },
};
