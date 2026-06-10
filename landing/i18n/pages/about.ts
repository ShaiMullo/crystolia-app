import type { Locale } from "../config";

export interface AboutSection {
  heading: string;
  paragraphs: string[];
}

export interface AboutPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  intro: string;
  sections: AboutSection[];
}

export const aboutContent: Record<Locale, AboutPageContent> = {
  en: {
    metaTitle: "About Crystolia | Quality Canola & Sunflower Oil Brand",
    metaDescription:
      "Crystolia is a food oil brand specializing in quality canola oil and sunflower oil for restaurants, catering, the food industry and private customers. Learn who we are.",
    title: "About Crystolia",
    intro:
      "Crystolia is a food oil brand specializing in quality cooking oils — primarily canola oil and sunflower oil — supplied to restaurants, catering businesses, the food industry, retailers and private customers. The brand operates in Hebrew, English and Russian, and is built on three commitments: consistent quality, reliable supply and dependable service.",
    sections: [
      {
        heading: "Who We Are",
        paragraphs: [
          "Crystolia was created with a simple idea: cooking oil is a daily essential for every kitchen — from a family home to a busy restaurant line — and it deserves the same consistency and care as any premium ingredient. We focus on what we know best: canola oil and sunflower oil, imported and distributed under strict quality control.",
          "Rather than offering an endless catalog, we concentrate on doing two products exceptionally well. Crystolia canola oil and Crystolia sunflower oil are available in 0.9-liter bottles for home use and 5-liter formats for professional kitchens, with consistent specification from batch to batch.",
        ],
      },
      {
        heading: "Crystolia Canola Oil",
        paragraphs: [
          "Crystolia canola oil is a refined cooking oil with a light, neutral taste and a clean profile. Its neutrality makes it a versatile choice for everyday cooking: light frying, sautéing, baking, sauces and salad dressings where the oil should support the dish rather than dominate it.",
          "Canola oil is naturally low in saturated fat compared to many other cooking fats, which is one reason it is widely used in both home and professional kitchens. Crystolia canola oil is supplied in 0.9L bottles for households and 5L containers for restaurants, catering and food businesses.",
        ],
      },
      {
        heading: "Crystolia Sunflower Oil",
        paragraphs: [
          "Crystolia sunflower oil is a pure, refined sunflower oil suited to everyday cooking and frying. It has a mild flavor and a golden color, and performs well at typical frying temperatures, making it a staple for cooking schnitzel, frying vegetables, baking and general kitchen use.",
          "Like our canola oil, Crystolia sunflower oil is available in a compact 0.9L bottle for home kitchens and a 5L format that fits the pace and volume of professional kitchens.",
        ],
      },
      {
        heading: "Supply for Businesses and Retailers",
        paragraphs: [
          "A significant part of Crystolia's activity is business supply. We serve retailers, minimarkets, grocery chains and wholesalers who need a dependable oil brand on their shelves at a fair price, with orderly logistics and consistent availability.",
          "Business customers value predictability above all: the same product, the same quality, delivered on the agreed schedule. Working directly with the source allows us to keep prices competitive without compromising on quality control.",
        ],
      },
      {
        heading: "Supply for Restaurants and Catering",
        paragraphs: [
          "Restaurants, catering operations and institutional kitchens are at the heart of what we do. A professional kitchen cannot afford surprises — not in flavor, not in frying performance and not in delivery times. Crystolia supplies 5-liter formats of canola and sunflower oil tailored to the daily reality of professional kitchens.",
          "We support our restaurant and catering customers with responsive service, flexible ordering and reliable nationwide delivery, so the kitchen never runs out of a basic ingredient in the middle of service.",
        ],
      },
      {
        heading: "Quality and Control",
        paragraphs: [
          "Quality is not a slogan at Crystolia — it is a process. Quality control is applied across the supply chain: from the source, through import and storage, to the moment the product reaches the customer. Every batch is checked to ensure it meets our specification for purity, color, taste and freshness.",
          "Our products are stored and transported under appropriate conditions to preserve their quality, and we continuously review our supply chain to maintain the standard our customers expect.",
        ],
      },
      {
        heading: "Import and Sourcing",
        paragraphs: [
          "Crystolia works directly with the source. Direct importing shortens the chain between the producer and the customer, which gives us better control over quality and cost. The result is a consistent product at a fair price — for retail chains, restaurants, catering businesses and private customers alike.",
        ],
      },
      {
        heading: "Our Vision",
        paragraphs: [
          "Our vision is to make Crystolia the name people trust for everyday cooking oils — a brand that stands for consistent quality, honest pricing and service you can rely on, in every language we serve: Hebrew, English and Russian.",
          "We believe a basic product done right builds long-term trust. That is how we approach every bottle, every delivery and every customer — whether it is a family kitchen, a neighborhood restaurant or a national food business.",
        ],
      },
    ],
  },
  he: {
    metaTitle: "אודות קריסטוליה | מותג שמן קנולה ושמן חמניות איכותי",
    metaDescription:
      "קריסטוליה (Crystolia) הוא מותג שמני מאכל המתמחה בשמן קנולה ושמן חמניות איכותיים למסעדות, קייטרינג, תעשיית המזון ולקוחות פרטיים. הכירו אותנו.",
    title: "אודות קריסטוליה",
    intro:
      "קריסטוליה (Crystolia) הוא מותג שמני מאכל המתמחה בשמני בישול איכותיים — ובראשם שמן קנולה ושמן חמניות — לאספקה למסעדות, עסקי קייטרינג, תעשיית המזון, קמעונאים ולקוחות פרטיים. המותג פועל בעברית, אנגלית ורוסית, ומבוסס על שלוש התחייבויות: איכות עקבית, אספקה אמינה ושירות שאפשר לסמוך עליו.",
    sections: [
      {
        heading: "מי אנחנו",
        paragraphs: [
          "קריסטוליה נולדה מתוך רעיון פשוט: שמן בישול הוא מצרך יומיומי בכל מטבח — מהבית המשפחתי ועד לקו עבודה עמוס במסעדה — ומגיע לו אותו יחס של עקביות והקפדה כמו לכל חומר גלם איכותי. אנחנו מתמקדים במה שאנחנו יודעים לעשות הכי טוב: שמן קנולה ושמן חמניות, המיובאים ומשווקים תחת בקרת איכות קפדנית.",
          "במקום קטלוג אינסופי של מוצרים, בחרנו להתרכז בשני מוצרים ולעשות אותם מצוין. שמן קנולה קריסטוליה ושמן חמניות קריסטוליה זמינים בבקבוקי 0.9 ליטר לשימוש ביתי ובאריזות 5 ליטר למטבחים מקצועיים — באותו מפרט קבוע, ממשלוח למשלוח.",
        ],
      },
      {
        heading: "שמן קנולה קריסטוליה",
        paragraphs: [
          "שמן קנולה קריסטוליה הוא שמן מאכל מזוקק בעל טעם עדין וניטרלי ופרופיל נקי. הניטרליות שלו הופכת אותו לבחירה רב-תכליתית לבישול יומיומי: טיגון קל, הקפצה, אפייה, רטבים וסלטים — בכל מקום שבו השמן צריך לתמוך במנה ולא להשתלט עליה.",
          "שמן קנולה מכיל באופן טבעי פחות שומן רווי בהשוואה לשומני בישול רבים אחרים, וזו אחת הסיבות לכך שהוא נפוץ כל כך במטבחים ביתיים ומקצועיים כאחד. שמן הקנולה של קריסטוליה מסופק בבקבוקי 0.9 ליטר למשקי בית ובמכלי 5 ליטר למסעדות, קייטרינג ועסקי מזון.",
        ],
      },
      {
        heading: "שמן חמניות קריסטוליה",
        paragraphs: [
          "שמן חמניות קריסטוליה הוא שמן חמניות טהור ומזוקק, המתאים לבישול וטיגון יומיומי. יש לו טעם עדין וגוון זהוב, והוא מתפקד היטב בטמפרטורות הטיגון המקובלות — מה שהופך אותו לבסיס קבוע להכנת שניצל, טיגון ירקות, אפייה ושימוש כללי במטבח.",
          "כמו שמן הקנולה שלנו, גם שמן החמניות של קריסטוליה זמין בבקבוק קומפקטי של 0.9 ליטר למטבח הביתי ובאריזת 5 ליטר המותאמת לקצב ולנפחים של מטבח מקצועי.",
        ],
      },
      {
        heading: "אספקה לעסקים וקמעונאים",
        paragraphs: [
          "חלק מרכזי מפעילות קריסטוליה הוא אספקה לעסקים. אנחנו משרתים קמעונאים, מינימרקטים, רשתות מזון וסיטונאים שזקוקים למותג שמן אמין על המדף, במחיר הוגן, עם לוגיסטיקה מסודרת וזמינות קבועה.",
          "לקוחות עסקיים מעריכים לפני הכול צפיוּת: אותו מוצר, אותה איכות, באספקה בזמן שסוכם. העבודה הישירה מול המקור מאפשרת לנו לשמור על מחיר תחרותי בלי להתפשר על בקרת האיכות.",
        ],
      },
      {
        heading: "אספקה למסעדות וקייטרינג",
        paragraphs: [
          "מסעדות, עסקי קייטרינג ומטבחים מוסדיים נמצאים בלב הפעילות שלנו. מטבח מקצועי לא יכול להרשות לעצמו הפתעות — לא בטעם, לא בביצועי הטיגון ולא בזמני האספקה. קריסטוליה מספקת אריזות 5 ליטר של שמן קנולה ושמן חמניות, המותאמות למציאות היומיומית של מטבח מקצועי.",
          "אנחנו מלווים את לקוחות המסעדנות והקייטרינג שלנו בשירות זמין, הזמנות גמישות ומשלוחים אמינים לכל הארץ — כדי שלמטבח לעולם לא ייגמר חומר גלם בסיסי באמצע השירות.",
        ],
      },
      {
        heading: "איכות ובקרה",
        paragraphs: [
          "איכות בקריסטוליה היא לא סיסמה — היא תהליך. בקרת איכות מתבצעת לאורך כל שרשרת האספקה: מהמקור, דרך הייבוא והאחסון, ועד לרגע שבו המוצר מגיע ללקוח. כל אצווה נבדקת כדי לוודא שהיא עומדת במפרט שלנו לניקיון, צבע, טעם וטריות.",
          "המוצרים שלנו מאוחסנים ומובלים בתנאים מתאימים לשמירה על איכותם, ואנחנו בוחנים את שרשרת האספקה באופן שוטף כדי לשמור על הסטנדרט שהלקוחות שלנו מצפים לו.",
        ],
      },
      {
        heading: "יבוא ומקור",
        paragraphs: [
          "קריסטוליה עובדת ישירות מול המקור. יבוא ישיר מקצר את השרשרת בין היצרן ללקוח, ומעניק לנו שליטה טובה יותר באיכות ובעלות. התוצאה היא מוצר עקבי במחיר הוגן — לרשתות, למסעדות, לעסקי קייטרינג וללקוחות פרטיים כאחד.",
        ],
      },
      {
        heading: "החזון שלנו",
        paragraphs: [
          "החזון שלנו הוא להפוך את קריסטוליה לשם שאנשים סומכים עליו בכל הנוגע לשמני בישול יומיומיים — מותג שמייצג איכות עקבית, תמחור הוגן ושירות שאפשר להישען עליו, בכל שפה שבה אנחנו פועלים: עברית, אנגלית ורוסית.",
          "אנחנו מאמינים שמוצר בסיסי שנעשה נכון בונה אמון לטווח ארוך. כך אנחנו ניגשים לכל בקבוק, לכל משלוח ולכל לקוח — בין אם מדובר במטבח משפחתי, במסעדה שכונתית או בעסק מזון ארצי.",
        ],
      },
    ],
  },
  ru: {
    metaTitle: "О компании Crystolia | Качественное рапсовое и подсолнечное масло",
    metaDescription:
      "Crystolia — бренд пищевых масел, специализирующийся на качественном рапсовом и подсолнечном масле для ресторанов, кейтеринга, пищевой промышленности и частных клиентов.",
    title: "О компании Crystolia",
    intro:
      "Crystolia — это бренд пищевых масел, специализирующийся на качественных маслах для готовки — прежде всего рапсовом (канола) и подсолнечном масле — для ресторанов, кейтеринговых компаний, пищевой промышленности, розничной торговли и частных клиентов. Бренд работает на иврите, английском и русском языках и строится на трёх обязательствах: стабильное качество, надёжные поставки и сервис, на который можно положиться.",
    sections: [
      {
        heading: "Кто мы",
        paragraphs: [
          "Crystolia родилась из простой идеи: растительное масло — ежедневная необходимость на любой кухне, от семейного дома до загруженной ресторанной линии, и оно заслуживает той же стабильности и внимания, что и любой премиальный ингредиент. Мы сосредоточены на том, что умеем лучше всего: рапсовое и подсолнечное масло, импортируемое и распределяемое под строгим контролем качества.",
          "Вместо бесконечного каталога мы концентрируемся на двух продуктах и делаем их безупречно. Рапсовое и подсолнечное масло Crystolia доступны в бутылках 0,9 литра для дома и в формате 5 литров для профессиональных кухонь — с одинаковой спецификацией от партии к партии.",
        ],
      },
      {
        heading: "Рапсовое масло Crystolia",
        paragraphs: [
          "Рапсовое масло Crystolia — это рафинированное масло с лёгким нейтральным вкусом и чистым профилем. Его нейтральность делает его универсальным выбором для повседневной готовки: лёгкая жарка, пассерование, выпечка, соусы и заправки — везде, где масло должно подчёркивать блюдо, а не доминировать.",
          "Рапсовое масло от природы содержит меньше насыщенных жиров по сравнению со многими другими кулинарными жирами — одна из причин его популярности как на домашних, так и на профессиональных кухнях. Масло поставляется в бутылках 0,9 л для дома и ёмкостях 5 л для ресторанов, кейтеринга и пищевого бизнеса.",
        ],
      },
      {
        heading: "Подсолнечное масло Crystolia",
        paragraphs: [
          "Подсолнечное масло Crystolia — чистое рафинированное масло для повседневной готовки и жарки. Оно обладает мягким вкусом и золотистым цветом, хорошо ведёт себя при стандартных температурах жарки и подходит для шницелей, жарки овощей, выпечки и общего кухонного использования.",
          "Как и рапсовое, подсолнечное масло Crystolia доступно в компактной бутылке 0,9 л для домашней кухни и в формате 5 л, рассчитанном на темп и объёмы профессиональной кухни.",
        ],
      },
      {
        heading: "Поставки для бизнеса и розницы",
        paragraphs: [
          "Значительная часть деятельности Crystolia — это поставки для бизнеса. Мы обслуживаем розничные магазины, минимаркеты, продуктовые сети и оптовиков, которым нужен надёжный бренд масла на полке по справедливой цене, с организованной логистикой и постоянным наличием.",
          "Бизнес-клиенты прежде всего ценят предсказуемость: тот же продукт, то же качество, доставка в согласованные сроки. Прямая работа с источником позволяет нам удерживать конкурентные цены без компромиссов в контроле качества.",
        ],
      },
      {
        heading: "Поставки для ресторанов и кейтеринга",
        paragraphs: [
          "Рестораны, кейтеринг и институциональные кухни — сердце нашей работы. Профессиональная кухня не может позволить себе сюрпризов — ни во вкусе, ни в поведении масла при жарке, ни в сроках доставки. Crystolia поставляет 5-литровые форматы рапсового и подсолнечного масла, созданные для ежедневной реальности профессиональной кухни.",
          "Мы поддерживаем наших клиентов из сферы ресторанов и кейтеринга отзывчивым сервисом, гибкими заказами и надёжной доставкой по всей стране — чтобы на кухне никогда не закончился базовый ингредиент в разгар смены.",
        ],
      },
      {
        heading: "Качество и контроль",
        paragraphs: [
          "Качество в Crystolia — не лозунг, а процесс. Контроль качества осуществляется по всей цепочке поставок: от источника, через импорт и хранение, до момента, когда продукт попадает к клиенту. Каждая партия проверяется на соответствие нашей спецификации по чистоте, цвету, вкусу и свежести.",
          "Наша продукция хранится и перевозится в надлежащих условиях для сохранения качества, и мы постоянно пересматриваем цепочку поставок, чтобы поддерживать стандарт, которого ожидают наши клиенты.",
        ],
      },
      {
        heading: "Импорт и источники",
        paragraphs: [
          "Crystolia работает напрямую с источником. Прямой импорт сокращает цепочку между производителем и клиентом, что даёт нам лучший контроль над качеством и стоимостью. Результат — стабильный продукт по справедливой цене: для торговых сетей, ресторанов, кейтеринга и частных клиентов.",
        ],
      },
      {
        heading: "Наше видение",
        paragraphs: [
          "Наше видение — сделать Crystolia именем, которому доверяют, когда речь идёт о повседневных маслах для готовки: бренд, который означает стабильное качество, честные цены и надёжный сервис — на каждом языке, на котором мы работаем: иврит, английский и русский.",
          "Мы верим, что базовый продукт, сделанный правильно, строит доверие на годы. Так мы подходим к каждой бутылке, каждой доставке и каждому клиенту — будь то семейная кухня, районный ресторан или национальный пищевой бизнес.",
        ],
      },
    ],
  },
};
