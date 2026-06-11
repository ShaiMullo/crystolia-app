import type { Metadata } from "next";
import { i18n } from "@/i18n/config";
import OilTypePage, {
  buildOilPageMetadata,
  resolveLocale,
} from "@/components/OilTypePage";

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  return buildOilPageMetadata("canola", resolveLocale(rawLocale));
}

export default async function CanolaOilPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  return <OilTypePage locale={resolveLocale(rawLocale)} oilType="canola" />;
}
