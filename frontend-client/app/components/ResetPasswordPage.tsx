"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";

type Locale = "he" | "en" | "ru";

const COPY = {
    he: {
        title: "בחירת סיסמה חדשה",
        subtitle: "הקישור הוא חד־פעמי. לאחר האיפוס כל החיבורים הקודמים לחשבון יבוטלו.",
        password: "סיסמה חדשה",
        confirm: "אימות סיסמה",
        hint: "לפחות 8 תווים, אות גדולה באנגלית ומספר",
        submit: "שמירת הסיסמה החדשה",
        loading: "שומר…",
        mismatch: "הסיסמאות אינן תואמות.",
        weak: "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה באנגלית ומספר.",
        invalid: "קישור האיפוס אינו תקין או שפג תוקפו. אפשר לבקש קישור חדש ממסך הכניסה.",
        success: "הסיסמה עודכנה בהצלחה. אפשר להתחבר כעת.",
        login: "מעבר למסך הכניסה",
    },
    en: {
        title: "Choose a new password",
        subtitle: "This is a one-time link. Resetting your password will invalidate previous account sessions.",
        password: "New password",
        confirm: "Confirm password",
        hint: "At least 8 characters, one uppercase letter and one number",
        submit: "Save new password",
        loading: "Saving…",
        mismatch: "Passwords do not match.",
        weak: "Password must contain at least 8 characters, one uppercase letter and one number.",
        invalid: "This reset link is invalid or expired. Request a new link from the sign-in page.",
        success: "Your password was updated. You can now sign in.",
        login: "Go to sign in",
    },
    ru: {
        title: "Создайте новый пароль",
        subtitle: "Ссылка одноразовая. После сброса предыдущие сеансы аккаунта станут недействительными.",
        password: "Новый пароль",
        confirm: "Подтвердите пароль",
        hint: "Не менее 8 символов, заглавная буква и цифра",
        submit: "Сохранить новый пароль",
        loading: "Сохранение…",
        mismatch: "Пароли не совпадают.",
        weak: "Пароль должен содержать не менее 8 символов, заглавную букву и цифру.",
        invalid: "Ссылка недействительна или истекла. Запросите новую ссылку на странице входа.",
        success: "Пароль обновлён. Теперь можно войти.",
        login: "Перейти ко входу",
    },
} as const;

export default function ResetPasswordPage({ locale: rawLocale }: { locale: string }) {
    const locale: Locale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : "he";
    const t = COPY[locale];
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [complete, setComplete] = useState(false);

    useEffect(() => {
        setToken(new URLSearchParams(window.location.search).get("token") || "");
    }, []);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError(t.mismatch);
            return;
        }
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            setError(t.weak);
            return;
        }
        if (!token) {
            setError(t.invalid);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            if (!response.ok) throw new Error("Invalid reset token");
            setComplete(true);
            setPassword("");
            setConfirm("");
        } catch {
            setError(t.invalid);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-16" dir={locale === "he" ? "rtl" : "ltr"}>
            <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-[#8b6508]">
                    <KeyRound size={28} aria-hidden="true" />
                </span>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{t.title}</h1>
                <p className="mt-3 leading-7 text-slate-600">{t.subtitle}</p>

                {complete ? (
                    <div className="mt-7" role="status">
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{t.success}</p>
                        <Link href={`/${locale}/auth?mode=login`} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[#F5C542] px-6 font-semibold text-[#3D2914] hover:bg-[#e5b832] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6508]">
                            {t.login}
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="mt-7 space-y-5">
                        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
                        <label className="block text-sm font-medium text-slate-700">
                            {t.password}
                            <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input mt-2" />
                            <span className="mt-2 block text-xs leading-5 text-slate-500">{t.hint}</span>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                            {t.confirm}
                            <input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input mt-2" />
                        </label>
                        <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F5C542] px-7 font-semibold text-[#3D2914] hover:bg-[#e5b832] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6508] disabled:cursor-not-allowed disabled:opacity-60">
                            {loading && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
                            {loading ? t.loading : t.submit}
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}
