"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import api from "@/app/lib/api";
import { COUNTRIES, isValidCompanyNumber } from "../lib/countries";

type AuthLocale = "he" | "en" | "ru";

interface GoogleCompleteRegistrationProps {
    locale: string;
}

const COPY = {
    he: {
        title: "השלמת פרטי העסק",
        subtitle: "כמעט סיימנו — נשארו רק פרטי העסק לבקשת ההרשמה",
        googleAccount: "חשבון Google מאומת",
        contactName: "שם מלא של איש הקשר",
        companyName: "שם משפטי/מסחרי של החברה",
        companyPlaceholder: "שם החברה או העסק",
        phone: "טלפון",
        country: "מדינה",
        countryPlaceholder: "בחרו מדינה",
        companyNumberIL: "ח.פ. / עוסק מורשה",
        companyNumberIntl: "VAT / Tax ID",
        companyNumberPlaceholderIL: "לדוגמה: 515123456",
        submit: "שליחת הרשמה לאישור",
        loading: "שולח…",
        required: "נא למלא את כל השדות.",
        invalidPhone: "נא להזין מספר טלפון תקין.",
        invalidCompanyNumberIL: "נא להזין ח.פ. / עוסק מורשה תקין (8–9 ספרות).",
        invalidCompanyNumberIntl: "נא להזין מספר VAT / Tax ID תקין.",
        accountExists: "כבר קיים חשבון עם כתובת האימייל הזאת. התחברו עם האימייל והסיסמה שלכם.",
        genericError: "לא הצלחנו להשלים את הפעולה. נסו שוב בעוד רגע.",
        note: "לאחר השליחה, צוות קריסטוליה יבדוק את הפרטים ויאשר את החשבון. עד לאישור לא ניתן להתחבר.",
    },
    en: {
        title: "Complete your business details",
        subtitle: "Almost done — just the business details are left for the registration request",
        googleAccount: "Verified Google account",
        contactName: "Contact full name",
        companyName: "Company legal/trade name",
        companyPlaceholder: "Company or business name",
        phone: "Phone",
        country: "Country",
        countryPlaceholder: "Select a country",
        companyNumberIL: "Company number (ח.פ.)",
        companyNumberIntl: "VAT / Tax ID",
        companyNumberPlaceholderIL: "e.g. 515123456",
        submit: "Submit registration for approval",
        loading: "Submitting…",
        required: "Please complete all fields.",
        invalidPhone: "Please enter a valid phone number.",
        invalidCompanyNumberIL: "Please enter a valid Israeli company number (8-9 digits).",
        invalidCompanyNumberIntl: "Please enter a valid VAT / Tax ID.",
        accountExists: "An account already exists for this email address. Sign in with your email and password.",
        genericError: "We couldn't complete the request. Please try again shortly.",
        note: "After submitting, the Crystolia team will review the details and approve the account. Sign-in stays locked until approval.",
    },
    ru: {
        title: "Заполните данные компании",
        subtitle: "Почти готово — для заявки на регистрацию остались только данные компании",
        googleAccount: "Подтверждённый аккаунт Google",
        contactName: "Имя контактного лица",
        companyName: "Юридическое/торговое название компании",
        companyPlaceholder: "Название компании или бизнеса",
        phone: "Телефон",
        country: "Страна",
        countryPlaceholder: "Выберите страну",
        companyNumberIL: "Номер компании (ח.פ.)",
        companyNumberIntl: "VAT / налоговый номер",
        companyNumberPlaceholderIL: "например, 515123456",
        submit: "Отправить регистрацию на проверку",
        loading: "Отправка…",
        required: "Заполните все поля.",
        invalidPhone: "Введите корректный номер телефона.",
        invalidCompanyNumberIL: "Введите корректный израильский номер компании (8–9 цифр).",
        invalidCompanyNumberIntl: "Введите корректный VAT / налоговый номер.",
        accountExists: "Аккаунт с этим адресом уже существует. Войдите с адресом электронной почты и паролем.",
        genericError: "Не удалось выполнить запрос. Повторите попытку позже.",
        note: "После отправки команда Crystolia проверит данные и подтвердит аккаунт. До подтверждения вход недоступен.",
    },
} as const;

export default function GoogleCompleteRegistration({ locale: rawLocale }: GoogleCompleteRegistrationProps) {
    const locale: AuthLocale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : "he";
    const t = COPY[locale];
    const isRTL = locale === "he";
    const router = useRouter();

    const [contextLoading, setContextLoading] = useState(true);
    const [googleEmail, setGoogleEmail] = useState("");
    const [formData, setFormData] = useState({
        contactName: "",
        companyName: "",
        phone: "",
        country: "",
        vatNumber: "",
    });
    const [status, setStatus] = useState<"idle" | "loading">("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.get("/auth/google/registration-context")
            .then((res) => {
                if (cancelled) return;
                setGoogleEmail(res.data?.data?.email ?? "");
                setFormData((current) => ({ ...current, contactName: res.data?.data?.name ?? "" }));
                setContextLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                router.replace(`/${locale}/auth?error=registration_expired`);
            });
        return () => { cancelled = true; };
    }, [locale, router]);

    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
        if (error) setError(null);
    };

    const validate = (): boolean => {
        if (
            !formData.contactName.trim() ||
            !formData.companyName.trim() ||
            !formData.phone.trim() ||
            !formData.country ||
            !formData.vatNumber.trim()
        ) {
            setError(t.required);
            return false;
        }
        const phoneDigits = formData.phone.replace(/\D/g, "");
        if (phoneDigits.length < 9 || phoneDigits.length > 15) {
            setError(t.invalidPhone);
            return false;
        }
        if (!isValidCompanyNumber(formData.country, formData.vatNumber)) {
            setError(formData.country === "IL" ? t.invalidCompanyNumberIL : t.invalidCompanyNumberIntl);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        if (!validate()) return;
        setStatus("loading");
        try {
            await api.post("/auth/google/complete-registration", {
                name: formData.contactName.trim(),
                companyName: formData.companyName.trim(),
                phone: formData.phone.trim(),
                country: formData.country,
                vatNumber: formData.vatNumber.trim(),
                locale,
            });
            router.replace(`/${locale}/auth?status=pending`);
        } catch (caught: unknown) {
            const response = (caught as { response?: { status?: number } }).response;
            if (response?.status === 409) setError(t.accountExists);
            else if (response?.status === 401) {
                router.replace(`/${locale}/auth?error=registration_expired`);
                return;
            } else setError(t.genericError);
            setStatus("idle");
        }
    };

    if (contextLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white" dir={isRTL ? "rtl" : "ltr"}>
                <Loader2 className="animate-spin text-[#d4a83a]" size={36} aria-label={t.loading} />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex min-h-screen items-center justify-center px-5 py-16 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <Image src="/crystolia-logo.png" alt="Crystolia" width={48} height={48} className="rounded-full" />
                        <span className="text-2xl font-light tracking-tight text-slate-900">Crystolia</span>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.title}</h1>
                        <p className="mt-3 text-slate-600">{t.subtitle}</p>
                    </div>

                    <p className="mb-6 flex items-center justify-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                        <Mail size={16} aria-hidden="true" />
                        <span className="sr-only">{t.googleAccount}: </span>
                        <span className="truncate" dir="ltr">{googleEmail}</span>
                    </p>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Field id="contactName" label={t.contactName}>
                            <input id="contactName" name="name" autoComplete="name" maxLength={120} required value={formData.contactName} onChange={(e) => updateField("contactName", e.target.value)} className="field-input" />
                        </Field>
                        <Field id="companyName" label={t.companyName}>
                            <input id="companyName" name="organization" autoComplete="organization" maxLength={160} required value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder={t.companyPlaceholder} className="field-input" />
                        </Field>
                        <Field id="phone" label={t.phone}>
                            <input id="phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={32} required value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="05X-XXX-XXXX" className="field-input" />
                        </Field>
                        <Field id="country" label={t.country}>
                            <select id="country" name="country" autoComplete="country" required value={formData.country} onChange={(e) => updateField("country", e.target.value)} className="field-input">
                                <option value="" disabled>{t.countryPlaceholder}</option>
                                {COUNTRIES.map((c) => (
                                    <option key={c.code} value={c.code}>{c[locale]}</option>
                                ))}
                            </select>
                        </Field>
                        <Field id="vatNumber" label={formData.country === "IL" || !formData.country ? t.companyNumberIL : t.companyNumberIntl}>
                            <input
                                id="vatNumber"
                                name="vatNumber"
                                inputMode={formData.country === "IL" ? "numeric" : "text"}
                                dir="ltr"
                                maxLength={32}
                                required
                                value={formData.vatNumber}
                                onChange={(e) => updateField("vatNumber", e.target.value)}
                                placeholder={formData.country === "IL" || !formData.country ? t.companyNumberPlaceholderIL : t.companyNumberIntl}
                                className="field-input"
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F5C542] px-8 py-4 text-base font-semibold text-[#3D2914] shadow-lg shadow-[#F5C542]/25 transition-colors duration-200 hover:bg-[#e5b832] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6508] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {status === "loading" && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
                            {status === "loading" ? t.loading : t.submit}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm leading-6 text-slate-600">{t.note}</p>
                </div>
            </div>
        </main>
    );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
            {children}
        </div>
    );
}
