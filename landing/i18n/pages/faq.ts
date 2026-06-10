import type { Locale } from "../config";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  items: FaqItem[];
}

export const faqContent: Record<Locale, FaqPageContent> = {
  en: {
    metaTitle: "FAQ | Crystolia — Canola Oil & Sunflower Oil Questions",
    metaDescription:
      "Frequently asked questions about Crystolia canola oil and sunflower oil: cooking uses, storage, restaurant and industry supply, sizes, ordering and more.",
    title: "Frequently Asked Questions",
    subtitle:
      "Everything you want to know about Crystolia, canola oil, sunflower oil, storage and supply for businesses.",
    items: [
      {
        q: "What is Crystolia?",
        a: "Crystolia is a food oil brand specializing in quality cooking oils — primarily canola oil and sunflower oil — supplied to restaurants, catering businesses, the food industry, retailers and private customers. The brand operates in Hebrew, English and Russian.",
      },
      {
        q: "What products does Crystolia offer?",
        a: "Crystolia offers two main product lines: Crystolia canola oil and Crystolia sunflower oil. Both are available in 0.9-liter bottles for home use and 5-liter formats for restaurants, catering and food businesses.",
      },
      {
        q: "What is canola oil?",
        a: "Canola oil is a refined vegetable oil pressed from rapeseed varieties bred to be low in erucic acid. It has a light, neutral taste, a high smoke point suitable for everyday cooking, and is naturally low in saturated fat compared to many other cooking fats.",
      },
      {
        q: "What is canola oil best used for?",
        a: "Thanks to its neutral flavor, canola oil is highly versatile: light frying, sautéing, baking, sauces, marinades and salad dressings. It lets the flavor of the dish come through without adding a taste of its own.",
      },
      {
        q: "What is sunflower oil best used for?",
        a: "Sunflower oil has a mild flavor and performs well at typical frying temperatures. It is a kitchen staple for frying schnitzel and vegetables, deep frying, baking and general everyday cooking.",
      },
      {
        q: "What is the difference between canola oil and sunflower oil?",
        a: "Both are refined, neutral cooking oils suitable for everyday use. Canola oil is slightly lower in saturated fat and has a particularly clean, neutral profile, while sunflower oil has a light golden color and a mild taste many cooks prefer for frying. In most recipes they can be used interchangeably.",
      },
      {
        q: "Are Crystolia oils suitable for deep frying?",
        a: "Yes. Both refined canola oil and refined sunflower oil have smoke points suitable for standard deep-frying temperatures (typically 160–180°C). For best results, keep the oil at a stable temperature, filter it between uses and replace it regularly.",
      },
      {
        q: "Are Crystolia oils suitable for baking?",
        a: "Yes. Neutral oils like canola and sunflower are excellent for baking — cakes, muffins and doughs — because they add moisture without affecting the flavor of the final product.",
      },
      {
        q: "What sizes do Crystolia oils come in?",
        a: "Crystolia canola oil and sunflower oil come in 0.9-liter bottles, ideal for households, and 5-liter containers designed for restaurants, catering operations, institutional kitchens and large families.",
      },
      {
        q: "How should I store cooking oil at home?",
        a: "Store cooking oil in a cool, dark place away from direct sunlight and heat sources such as the stove. Keep the cap tightly closed after each use. Properly stored, an unopened bottle keeps its quality until the best-before date marked on the packaging.",
      },
      {
        q: "How long does cooking oil last after opening?",
        a: "Once opened, refined canola or sunflower oil is best used within a few months. Keep it tightly closed in a cool, dark cabinet. If the oil develops an off smell, a sharp taste or visible cloudiness at room temperature, replace it.",
      },
      {
        q: "Why does oil sometimes look cloudy in cold weather?",
        a: "At low temperatures, natural components of vegetable oil can crystallize and make it look cloudy. This is a physical reaction, not a defect — the oil returns to clear at room temperature and remains safe to use.",
      },
      {
        q: "Can I reuse frying oil?",
        a: "In home cooking, oil can usually be reused a few times if it was not overheated: strain it after cooling, store it closed and away from light, and discard it once it darkens, foams or smells off. Professional kitchens should follow their regulatory and food-safety guidelines for oil replacement.",
      },
      {
        q: "Does Crystolia supply restaurants?",
        a: "Yes. Restaurants and professional kitchens are core Crystolia customers. We supply 5-liter formats of canola and sunflower oil with reliable nationwide delivery, flexible ordering and consistent batch-to-batch quality that professional kitchens depend on.",
      },
      {
        q: "Does Crystolia supply catering businesses and institutional kitchens?",
        a: "Yes. Crystolia supplies catering operations, event kitchens and institutional dining facilities with 5-liter oil formats, scheduled deliveries and responsive service designed around high-volume cooking.",
      },
      {
        q: "Does Crystolia work with the food industry and wholesalers?",
        a: "Yes. Crystolia serves food manufacturers, wholesalers, grocery chains and minimarkets that need a dependable oil brand at a fair price with orderly logistics. Contact us for business terms and volume pricing.",
      },
      {
        q: "Can private customers buy Crystolia oil?",
        a: "Yes. Crystolia serves private customers as well as businesses. The 0.9-liter bottles of canola and sunflower oil are designed for home kitchens, and the 5-liter format suits large families and heavy home use.",
      },
      {
        q: "How do I order Crystolia oil or get a price quote?",
        a: "The fastest way is to message us on WhatsApp or leave your details in the contact form on the site. Our team responds quickly with availability, pricing and delivery details — in Hebrew, English or Russian.",
      },
      {
        q: "Where does Crystolia deliver?",
        a: "Crystolia delivers nationwide. Delivery schedules are agreed in advance, and business customers can set up regular recurring supply so the kitchen or shelf never runs empty.",
      },
      {
        q: "How does Crystolia ensure oil quality?",
        a: "Quality control is applied across the entire supply chain — from the source, through import and storage, to final delivery. Every batch is checked against the brand's specification for purity, color, taste and freshness.",
      },
      {
        q: "Where does Crystolia oil come from?",
        a: "Crystolia works directly with the source and imports its oils under strict quality control. Direct sourcing shortens the supply chain, which improves both quality control and pricing for our customers.",
      },
      {
        q: "Is canola oil healthy?",
        a: "Canola oil is naturally low in saturated fat and contains unsaturated fats, including omega-3 alpha-linolenic acid, which is why health authorities in many countries consider it a good everyday cooking oil as part of a balanced diet. For personal dietary advice, consult a qualified professional.",
      },
      {
        q: "In which languages does Crystolia operate?",
        a: "Crystolia operates in three languages: Hebrew, English and Russian. The website, product information and customer service are available in all three.",
      },
    ],
  },
  he: {
    metaTitle: "שאלות נפוצות | קריסטוליה — שמן קנולה ושמן חמניות",
    metaDescription:
      "שאלות ותשובות נפוצות על שמן קריסטוליה: שמן קנולה, שמן חמניות, שימושי בישול, אחסון שמן, אספקה למסעדות ולתעשייה, גדלים והזמנות.",
    title: "שאלות נפוצות",
    subtitle:
      "כל מה שרציתם לדעת על קריסטוליה, שמן קנולה, שמן חמניות, אחסון שמן ואספקה לעסקים.",
    items: [
      {
        q: "מה זה קריסטוליה (Crystolia)?",
        a: "קריסטוליה (Crystolia) הוא מותג שמני מאכל המתמחה בשמני בישול איכותיים — בעיקר שמן קנולה ושמן חמניות — לאספקה למסעדות, עסקי קייטרינג, תעשיית המזון, קמעונאים ולקוחות פרטיים. המותג פועל בעברית, אנגלית ורוסית.",
      },
      {
        q: "אילו מוצרים יש לקריסטוליה?",
        a: "לקריסטוליה שני קווי מוצרים עיקריים: שמן קנולה קריסטוליה ושמן חמניות קריסטוליה. שניהם זמינים בבקבוקי 0.9 ליטר לשימוש ביתי ובאריזות 5 ליטר למסעדות, קייטרינג ועסקי מזון.",
      },
      {
        q: "מה זה שמן קנולה?",
        a: "שמן קנולה הוא שמן צמחי מזוקק המופק מזני לפתית שטופחו להכיל מעט חומצה ארוקית. יש לו טעם עדין וניטרלי, נקודת עישון גבוהה המתאימה לבישול יומיומי, והוא מכיל באופן טבעי פחות שומן רווי בהשוואה לשומני בישול רבים אחרים.",
      },
      {
        q: "למה שמן קנולה הכי מתאים?",
        a: "בזכות הטעם הניטרלי שלו, שמן קנולה הוא רב-תכליתי במיוחד: טיגון קל, הקפצה, אפייה, רטבים, מרינדות וסלטים. הוא מאפשר לטעם של המנה לבלוט בלי להוסיף טעם משלו.",
      },
      {
        q: "למה שמן חמניות הכי מתאים?",
        a: "לשמן חמניות טעם עדין והוא מתפקד היטב בטמפרטורות טיגון מקובלות. הוא מצרך בסיסי במטבח לטיגון שניצלים וירקות, טיגון עמוק, אפייה ובישול יומיומי.",
      },
      {
        q: "מה ההבדל בין שמן קנולה לשמן חמניות?",
        a: "שניהם שמני בישול מזוקקים וניטרליים המתאימים לשימוש יומיומי. שמן קנולה מכיל מעט פחות שומן רווי ובעל פרופיל נקי וניטרלי במיוחד, ואילו שמן חמניות בעל גוון זהוב בהיר וטעם עדין שטבחים רבים מעדיפים לטיגון. ברוב המתכונים אפשר להחליף ביניהם.",
      },
      {
        q: "האם השמנים של קריסטוליה מתאימים לטיגון עמוק?",
        a: "כן. גם שמן קנולה מזוקק וגם שמן חמניות מזוקק בעלי נקודת עישון המתאימה לטמפרטורות טיגון עמוק סטנדרטיות (בדרך כלל 160–180 מעלות). לתוצאה מיטבית מומלץ לשמור על טמפרטורה יציבה, לסנן את השמן בין שימושים ולהחליפו באופן סדיר.",
      },
      {
        q: "האם השמנים של קריסטוליה מתאימים לאפייה?",
        a: "כן. שמנים ניטרליים כמו קנולה וחמניות מצוינים לאפייה — עוגות, מאפינס ובצקים — כי הם מוסיפים לחות בלי להשפיע על הטעם של המוצר הסופי.",
      },
      {
        q: "באילו גדלים מגיעים השמנים של קריסטוליה?",
        a: "שמן הקנולה ושמן החמניות של קריסטוליה מגיעים בבקבוקי 0.9 ליטר, אידיאליים למשקי בית, ובמכלי 5 ליטר המיועדים למסעדות, קייטרינג, מטבחים מוסדיים ומשפחות גדולות.",
      },
      {
        q: "איך נכון לאחסן שמן בישול בבית?",
        a: "מאחסנים שמן בישול במקום קריר וחשוך, הרחק מאור שמש ישיר וממקורות חום כמו הכיריים. סוגרים את הפקק היטב אחרי כל שימוש. באחסון נכון, בקבוק סגור שומר על איכותו עד תאריך התוקף המסומן על האריזה.",
      },
      {
        q: "כמה זמן שמן נשמר אחרי הפתיחה?",
        a: "אחרי הפתיחה, מומלץ לצרוך שמן קנולה או חמניות מזוקק בתוך מספר חודשים. יש לשמור אותו סגור היטב בארון קריר וחשוך. אם השמן מפתח ריח לוואי, טעם חריף או עכירות בטמפרטורת החדר — מומלץ להחליפו.",
      },
      {
        q: "למה שמן נראה לפעמים עכור בקור?",
        a: "בטמפרטורות נמוכות, רכיבים טבעיים בשמן צמחי עשויים להתגבש ולגרום לו להיראות עכור. זו תופעה פיזיקלית ולא פגם — השמן חוזר להיות צלול בטמפרטורת החדר ונשאר בטוח לשימוש.",
      },
      {
        q: "האם אפשר לעשות שימוש חוזר בשמן טיגון?",
        a: "בבישול ביתי אפשר בדרך כלל להשתמש בשמן מספר פעמים אם הוא לא חומם יתר על המידה: מסננים אותו אחרי שהתקרר, שומרים סגור והרחק מאור, ומשליכים כשהוא מכהה, מקציף או מפתח ריח. מטבחים מקצועיים נדרשים לפעול לפי הנחיות הרגולציה ובטיחות המזון להחלפת שמן.",
      },
      {
        q: "האם קריסטוליה מספקת שמן למסעדות?",
        a: "כן. מסעדות ומטבחים מקצועיים הם לקוחות ליבה של קריסטוליה. אנחנו מספקים אריזות 5 ליטר של שמן קנולה ושמן חמניות, עם משלוחים אמינים לכל הארץ, הזמנות גמישות ואיכות עקבית ממשלוח למשלוח.",
      },
      {
        q: "האם קריסטוליה מספקת לעסקי קייטרינג ומטבחים מוסדיים?",
        a: "כן. קריסטוליה מספקת לעסקי קייטרינג, מטבחי אירועים וחדרי אוכל מוסדיים אריזות שמן של 5 ליטר, משלוחים מתוזמנים ושירות זמין שנבנה סביב בישול בנפחים גדולים.",
      },
      {
        q: "האם קריסטוליה עובדת עם תעשיית המזון וסיטונאים?",
        a: "כן. קריסטוליה משרתת יצרני מזון, סיטונאים, רשתות מזון ומינימרקטים שזקוקים למותג שמן אמין במחיר הוגן ועם לוגיסטיקה מסודרת. צרו קשר לתנאים עסקיים ומחירי כמויות.",
      },
      {
        q: "האם לקוחות פרטיים יכולים לקנות שמן קריסטוליה?",
        a: "כן. קריסטוליה משרתת גם לקוחות פרטיים. בקבוקי 0.9 הליטר של שמן קנולה ושמן חמניות מיועדים למטבח הביתי, ואריזת 5 הליטר מתאימה למשפחות גדולות ולשימוש ביתי מוגבר.",
      },
      {
        q: "איך מזמינים שמן קריסטוליה או מקבלים הצעת מחיר?",
        a: "הדרך המהירה ביותר היא לשלוח לנו הודעה בוואטסאפ או להשאיר פרטים בטופס יצירת הקשר באתר. הצוות שלנו חוזר במהירות עם זמינות, מחירים ופרטי משלוח — בעברית, אנגלית או רוסית.",
      },
      {
        q: "לאן קריסטוליה מספקת?",
        a: "קריסטוליה מספקת לכל הארץ. מועדי האספקה מתואמים מראש, ולקוחות עסקיים יכולים לקבוע אספקה קבועה ושוטפת — כדי שהמטבח או המדף לעולם לא יישארו ריקים.",
      },
      {
        q: "איך קריסטוליה מבטיחה את איכות השמן?",
        a: "בקרת איכות מתבצעת לאורך כל שרשרת האספקה — מהמקור, דרך הייבוא והאחסון, ועד למסירה ללקוח. כל אצווה נבדקת מול המפרט של המותג לניקיון, צבע, טעם וטריות.",
      },
      {
        q: "מאיפה מגיע השמן של קריסטוליה?",
        a: "קריסטוליה עובדת ישירות מול המקור ומייבאת את השמנים שלה תחת בקרת איכות קפדנית. עבודה ישירה מקצרת את שרשרת האספקה ומשפרת גם את בקרת האיכות וגם את המחיר ללקוח.",
      },
      {
        q: "האם שמן קנולה בריא?",
        a: "שמן קנולה מכיל באופן טבעי מעט שומן רווי ועשיר בשומנים בלתי רוויים, כולל חומצה אלפא-לינולנית מסוג אומגה 3. זו הסיבה שגופי בריאות במדינות רבות רואים בו שמן בישול יומיומי טוב כחלק מתזונה מאוזנת. לייעוץ תזונתי אישי מומלץ לפנות לאיש מקצוע מוסמך.",
      },
      {
        q: "באילו שפות קריסטוליה פועלת?",
        a: "קריסטוליה פועלת בשלוש שפות: עברית, אנגלית ורוסית. האתר, מידע המוצרים ושירות הלקוחות זמינים בשלושתן.",
      },
    ],
  },
  ru: {
    metaTitle: "Вопросы и ответы | Crystolia — рапсовое и подсолнечное масло",
    metaDescription:
      "Частые вопросы о маслах Crystolia: рапсовое (канола) и подсолнечное масло, применение в готовке, хранение, поставки для ресторанов и бизнеса, объёмы и заказ.",
    title: "Часто задаваемые вопросы",
    subtitle:
      "Всё, что вы хотели знать о Crystolia, рапсовом и подсолнечном масле, хранении масла и поставках для бизнеса.",
    items: [
      {
        q: "Что такое Crystolia?",
        a: "Crystolia — бренд пищевых масел, специализирующийся на качественных маслах для готовки — прежде всего рапсовом (канола) и подсолнечном масле — для ресторанов, кейтеринга, пищевой промышленности, розницы и частных клиентов. Бренд работает на иврите, английском и русском языках.",
      },
      {
        q: "Какие продукты предлагает Crystolia?",
        a: "У Crystolia две основные линейки: рапсовое масло Crystolia и подсолнечное масло Crystolia. Оба доступны в бутылках 0,9 литра для дома и в формате 5 литров для ресторанов, кейтеринга и пищевого бизнеса.",
      },
      {
        q: "Что такое рапсовое масло (канола)?",
        a: "Рапсовое масло (канола) — это рафинированное растительное масло из сортов рапса, выведенных с низким содержанием эруковой кислоты. У него лёгкий нейтральный вкус, высокая температура дымления для повседневной готовки и от природы низкое содержание насыщенных жиров по сравнению со многими другими кулинарными жирами.",
      },
      {
        q: "Для чего лучше всего подходит рапсовое масло?",
        a: "Благодаря нейтральному вкусу рапсовое масло универсально: лёгкая жарка, пассерование, выпечка, соусы, маринады и заправки для салатов. Оно подчёркивает вкус блюда, не добавляя собственного.",
      },
      {
        q: "Для чего лучше всего подходит подсолнечное масло?",
        a: "Подсолнечное масло обладает мягким вкусом и хорошо ведёт себя при стандартных температурах жарки. Это базовый продукт кухни: жарка шницелей и овощей, фритюр, выпечка и повседневная готовка.",
      },
      {
        q: "В чём разница между рапсовым и подсолнечным маслом?",
        a: "Оба — рафинированные нейтральные масла для повседневного использования. В рапсовом чуть меньше насыщенных жиров и особенно чистый нейтральный профиль, а у подсолнечного — светло-золотистый цвет и мягкий вкус, который многие повара предпочитают для жарки. В большинстве рецептов они взаимозаменяемы.",
      },
      {
        q: "Подходят ли масла Crystolia для фритюра?",
        a: "Да. И рафинированное рапсовое, и рафинированное подсолнечное масло имеют температуру дымления, подходящую для стандартных температур фритюра (обычно 160–180°C). Для лучшего результата поддерживайте стабильную температуру, фильтруйте масло между использованиями и регулярно его меняйте.",
      },
      {
        q: "Подходят ли масла Crystolia для выпечки?",
        a: "Да. Нейтральные масла, такие как рапсовое и подсолнечное, отлично подходят для выпечки — тортов, маффинов и теста — они добавляют влагу, не влияя на вкус готового продукта.",
      },
      {
        q: "В каких объёмах выпускаются масла Crystolia?",
        a: "Рапсовое и подсолнечное масло Crystolia выпускаются в бутылках 0,9 литра — идеально для дома — и в ёмкостях 5 литров для ресторанов, кейтеринга, институциональных кухонь и больших семей.",
      },
      {
        q: "Как правильно хранить растительное масло дома?",
        a: "Храните масло в прохладном тёмном месте, вдали от прямых солнечных лучей и источников тепла, таких как плита. Плотно закрывайте крышку после каждого использования. При правильном хранении закрытая бутылка сохраняет качество до даты, указанной на упаковке.",
      },
      {
        q: "Сколько хранится масло после открытия?",
        a: "После открытия рафинированное рапсовое или подсолнечное масло лучше использовать в течение нескольких месяцев. Держите его плотно закрытым в прохладном тёмном шкафу. Если у масла появился посторонний запах, резкий вкус или помутнение при комнатной температуре — замените его.",
      },
      {
        q: "Почему масло иногда мутнеет на холоде?",
        a: "При низких температурах естественные компоненты растительного масла могут кристаллизоваться, и оно выглядит мутным. Это физическое явление, а не дефект — при комнатной температуре масло снова становится прозрачным и остаётся пригодным к использованию.",
      },
      {
        q: "Можно ли использовать масло для жарки повторно?",
        a: "В домашней готовке масло обычно можно использовать несколько раз, если оно не перегревалось: процедите его после остывания, храните закрытым и вдали от света, и выбросьте, когда оно потемнеет, начнёт пениться или приобретёт запах. Профессиональные кухни должны следовать нормам пищевой безопасности по замене масла.",
      },
      {
        q: "Поставляет ли Crystolia масло ресторанам?",
        a: "Да. Рестораны и профессиональные кухни — ключевые клиенты Crystolia. Мы поставляем 5-литровые форматы рапсового и подсолнечного масла с надёжной доставкой по всей стране, гибкими заказами и стабильным качеством от партии к партии.",
      },
      {
        q: "Работает ли Crystolia с кейтерингом и институциональными кухнями?",
        a: "Да. Crystolia поставляет кейтеринговым компаниям, кухням мероприятий и столовым 5-литровые форматы масла, плановые поставки и отзывчивый сервис, рассчитанный на готовку в больших объёмах.",
      },
      {
        q: "Работает ли Crystolia с пищевой промышленностью и оптовиками?",
        a: "Да. Crystolia обслуживает производителей продуктов питания, оптовиков, продуктовые сети и минимаркеты, которым нужен надёжный бренд масла по справедливой цене с организованной логистикой. Свяжитесь с нами для обсуждения условий и оптовых цен.",
      },
      {
        q: "Могут ли частные клиенты купить масло Crystolia?",
        a: "Да. Crystolia работает и с частными клиентами. Бутылки 0,9 литра рапсового и подсолнечного масла созданы для домашней кухни, а формат 5 литров подходит большим семьям и активному домашнему использованию.",
      },
      {
        q: "Как заказать масло Crystolia или получить расчёт цены?",
        a: "Быстрее всего — написать нам в WhatsApp или оставить данные в контактной форме на сайте. Наша команда быстро отвечает с информацией о наличии, ценах и доставке — на иврите, английском или русском.",
      },
      {
        q: "Куда доставляет Crystolia?",
        a: "Crystolia доставляет по всей стране. Сроки доставки согласовываются заранее, а бизнес-клиенты могут настроить регулярные поставки, чтобы кухня или полка никогда не пустовали.",
      },
      {
        q: "Как Crystolia обеспечивает качество масла?",
        a: "Контроль качества осуществляется по всей цепочке поставок — от источника, через импорт и хранение, до финальной доставки. Каждая партия проверяется на соответствие спецификации бренда по чистоте, цвету, вкусу и свежести.",
      },
      {
        q: "Откуда поступает масло Crystolia?",
        a: "Crystolia работает напрямую с источником и импортирует масла под строгим контролем качества. Прямые закупки сокращают цепочку поставок, что улучшает и контроль качества, и цену для клиентов.",
      },
      {
        q: "Полезно ли рапсовое масло?",
        a: "Рапсовое масло от природы содержит мало насыщенных жиров и богато ненасыщенными, включая омега-3 альфа-линоленовую кислоту, поэтому органы здравоохранения многих стран считают его хорошим повседневным маслом в рамках сбалансированного питания. За персональными рекомендациями обратитесь к специалисту.",
      },
      {
        q: "На каких языках работает Crystolia?",
        a: "Crystolia работает на трёх языках: иврит, английский и русский. Сайт, информация о продуктах и обслуживание клиентов доступны на всех трёх.",
      },
    ],
  },
};
