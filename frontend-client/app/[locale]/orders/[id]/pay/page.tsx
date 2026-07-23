"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Loader2, ShieldCheck } from "lucide-react";
import api from "@/app/lib/api";

interface PageProps {
    params: Promise<{ locale: string; id: string }>;
}

interface OrderSummary {
    _id: string;
    totalAmount: number;
}

const COPY = {
    he: {
        title: "תשלום עבור ההזמנה",
        subtitle: "התשלום המקוון עדיין אינו פעיל",
        body: "כדי לשמור על פרטי התשלום שלכם, לא נציג סליקה עד שהחיבור לספק מאובטח ונבדק במלואו.",
        manual: "צוות Crystolia יתאם אתכם תשלום בהעברה בנקאית או בדרך שסוכמה מול העסק.",
        amount: "סכום ההזמנה",
        back: "חזרה להזמנות",
        loading: "טוען את פרטי ההזמנה…",
        missing: "לא מצאנו את ההזמנה בחשבון הזה.",
    },
    en: {
        title: "Order payment",
        subtitle: "Online payment is not enabled yet",
        body: "To protect your payment details, checkout will remain unavailable until the provider connection is fully secured and verified.",
        manual: "The Crystolia team will coordinate payment by bank transfer or another agreed business method.",
        amount: "Order total",
        back: "Back to orders",
        loading: "Loading order details…",
        missing: "We could not find this order in your account.",
    },
    ru: {
        title: "Оплата заказа",
        subtitle: "Онлайн-оплата пока недоступна",
        body: "Для защиты платёжных данных онлайн-оплата появится только после полной проверки безопасного подключения к провайдеру.",
        manual: "Команда Crystolia согласует оплату банковским переводом или другим утверждённым способом.",
        amount: "Сумма заказа",
        back: "Вернуться к заказам",
        loading: "Загрузка данных заказа…",
        missing: "Этот заказ не найден в вашем аккаунте.",
    },
} as const;

export default function OrderPaymentPage({ params }: PageProps) {
    const { locale: rawLocale, id } = use(params);
    const locale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : "he";
    const t = COPY[locale];
    const isRTL = locale === "he";
    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.get("/v1/me/orders")
            .then((response) => {
                const orders = Array.isArray(response.data?.data) ? response.data.data : [];
                if (!cancelled) setOrder(orders.find((entry: OrderSummary) => entry._id === id) || null);
            })
            .catch(() => {
                if (!cancelled) setOrder(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [id]);

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-950" dir={isRTL ? "rtl" : "ltr"}>
            <div className="mx-auto max-w-lg">
                <Link
                    href={`/${locale}/dashboard`}
                    className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a]"
                >
                    {isRTL ? <ArrowRight size={18} aria-hidden="true" /> : <ArrowLeft size={18} aria-hidden="true" />}
                    {t.back}
                </Link>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                    <div className="h-2 bg-[#F5C542]" />
                    <div className="p-7 sm:p-10">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#8b6508]">
                            <ShieldCheck size={28} aria-hidden="true" />
                        </span>
                        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.title}</h1>

                        {loading ? (
                            <p className="mt-8 flex items-center gap-2 text-slate-600" role="status">
                                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                                {t.loading}
                            </p>
                        ) : order ? (
                            <>
                                <div className="mt-7 rounded-2xl bg-slate-50 p-5">
                                    <p className="text-sm font-medium text-slate-600">{t.amount}</p>
                                    <p className="mt-1 text-3xl font-semibold" dir="ltr">
                                        ₪{order.totalAmount.toLocaleString()}
                                    </p>
                                </div>
                                <h2 className="mt-8 text-lg font-semibold">{t.subtitle}</h2>
                                <p className="mt-3 text-base leading-7 text-slate-700">{t.body}</p>
                                <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                                    <Building2 className="mt-0.5 shrink-0" size={22} aria-hidden="true" />
                                    <p className="text-sm leading-6">{t.manual}</p>
                                </div>
                            </>
                        ) : (
                            <p className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                                {t.missing}
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
