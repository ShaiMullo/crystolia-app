import { getDictionary } from "@/i18n/getDictionary";
import { Locale } from "@/i18n/config";

import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import Products from "@/app/components/Products";
import About from "@/app/components/About";
import Contact from "@/app/components/Contact";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function Page({ params }: PageProps) {
  // ודא שהערך מתאים לטייפ הנכון
  const locale = params.locale as Locale;

  // טוען מילון לפי שפה
  const dict = await getDictionary(locale);

  return (
    <main>
      <Hero dict={dict} locale={locale} />
      <Features dict={dict} locale={locale} />
      <Products dict={dict} locale={locale} />
      <About dict={dict} locale={locale} />
      <Contact dict={dict} locale={locale} />
    </main>
  );
}

