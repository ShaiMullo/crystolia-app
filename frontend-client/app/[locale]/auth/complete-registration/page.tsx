import GoogleCompleteRegistration from "@/app/components/GoogleCompleteRegistration";
import { Locale, i18n } from "@/i18n/config";

interface PageProps {
    params: Promise<{ locale: string }> | { locale: string };
}

export default async function CompleteRegistration({ params }: PageProps) {
    const resolvedParams = await Promise.resolve(params);
    const rawLocale = resolvedParams.locale;

    let locale: Locale;
    if (rawLocale && typeof rawLocale === "string" && i18n.locales.includes(rawLocale as Locale)) {
        locale = rawLocale as Locale;
    } else {
        locale = i18n.defaultLocale as Locale;
    }

    return <GoogleCompleteRegistration locale={locale} />;
}
