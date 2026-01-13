import { getDictionary } from "@/i18n/getDictionary";
import { Locale } from "@/i18n/config";

import Hero from "@/app/components/Hero";
import Features from "@/app/components/Features";
import Products from "@/app/components/Products";
import About from "@/app/components/About";
import Contact from "@/app/components/Contact";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  // Next.js 15+ requires awaiting params before accessing properties
  const { locale } = await params;

  // Cast to Locale type for type safety
  const typedLocale = locale as Locale;

  // Load dictionary for the current language
  const dict = await getDictionary(typedLocale);

  return (
    <main>
      <Hero dict={dict} locale={typedLocale} />
      <Features dict={dict} locale={typedLocale} />
      <Products dict={dict} locale={typedLocale} />
      <About dict={dict} locale={typedLocale} />
      <Contact dict={dict} locale={typedLocale} />
    </main>
  );
}
