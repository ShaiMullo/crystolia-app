import Link from "next/link";
import { notFound } from "next/navigation";
import { demoPaymentPagesDisabled } from "@/app/lib/demoPages";
import type { Metadata } from "next";
import {
    ArrowLeft,
    ArrowRight,
    CreditCard,
    ExternalLink,
    ShieldCheck,
} from "lucide-react";

// Demo-only surface: never indexed, and DISABLED BY DEFAULT in production
// (fail closed — see app/lib/demoPages.ts). Explicitly re-enable with
// DEMO_PAYMENT_PAGES_DISABLED=false for demonstration environments only.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

interface PageProps {
    params: Promise<{ locale: string }>;
}

const COPY = {
    he: {
        eyebrow: "הדגמת מערכת תשלום",
        title: "כאן תתחבר מערכת הסליקה",
        body: "זהו מסך הדגמה בלבד לצורך הצגת תהליך ההזמנה. בשלב זה לא מתבצע חיוב אמיתי ולא נאספים פרטי כרטיס אשראי.",
        status: "הסליקה עדיין אינה מחוברת",
        explanation: "במערכת המלאה הכפתור יוביל לספק סליקה מאובטח, יציג את סכום ההזמנה ויחזיר למערכת אישור תשלום.",
        safe: "אין להזין כאן פרטי תשלום אמיתיים.",
        back: "חזרה לאזור העסקי",
        learnMore: "חזרה לאתר Crystolia",
    },
    en: {
        eyebrow: "Payment system demo",
        title: "The payment provider will be connected here",
        body: "This is a demonstration screen for presenting the order flow. No real charge is made and no card details are collected.",
        status: "Online payments are not connected yet",
        explanation: "In the complete system, this step will open a secure payment provider, show the order amount and return a payment confirmation.",
        safe: "Do not enter real payment details here.",
        back: "Back to the business portal",
        learnMore: "Back to the Crystolia website",
    },
    ru: {
        eyebrow: "Демонстрация оплаты",
        title: "Здесь будет подключена платёжная система",
        body: "Это демонстрационный экран для показа процесса заказа. Реальное списание не выполняется, данные карты не собираются.",
        status: "Онлайн-оплата пока не подключена",
        explanation: "В полной версии этот шаг откроет защищённого платёжного провайдера, покажет сумму заказа и вернёт подтверждение оплаты.",
        safe: "Не вводите здесь реальные платёжные данные.",
        back: "Вернуться в бизнес-портал",
        learnMore: "Вернуться на сайт Crystolia",
    },
} as const;

export default async function PaymentDemoPage({ params }: PageProps) {
    if (demoPaymentPagesDisabled()) notFound();
    const { locale: rawLocale } = await params;
    const locale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : "he";
    const t = COPY[locale];
    const isRTL = locale === "he";

    return (
        <main
            className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950 sm:py-20"
            dir={isRTL ? "rtl" : "ltr"}
        >
            <div className="mx-auto max-w-2xl">
                <Link
                    href={`/${locale}/dashboard`}
                    className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a]"
                >
                    {isRTL
                        ? <ArrowRight size={18} aria-hidden="true" />
                        : <ArrowLeft size={18} aria-hidden="true" />}
                    {t.back}
                </Link>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                    <div className="h-2 bg-[#F5C542]" />
                    <div className="p-7 sm:p-10">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#8b6508]">
                            <CreditCard size={28} aria-hidden="true" />
                        </div>

                        <p className="mt-6 text-sm font-semibold tracking-wide text-[#8b6508]">
                            {t.eyebrow}
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {t.title}
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-slate-700">
                            {t.body}
                        </p>

                        <div
                            className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5"
                            role="status"
                        >
                            <div className="flex items-start gap-3">
                                <ShieldCheck
                                    className="mt-0.5 shrink-0 text-[#8b6508]"
                                    size={24}
                                    aria-hidden="true"
                                />
                                <div>
                                    <h2 className="font-semibold text-amber-950">{t.status}</h2>
                                    <p className="mt-2 text-sm leading-6 text-amber-900">
                                        {t.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                            {t.safe}
                        </p>

                        <Link
                            href={`/${locale}`}
                            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                        >
                            {t.learnMore}
                            <ExternalLink size={17} aria-hidden="true" />
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
