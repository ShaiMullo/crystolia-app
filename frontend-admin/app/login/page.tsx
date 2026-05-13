"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "@/app/lib/api";
import { useAdminI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login, user, isLoading } = useAuth();
    const { t } = useAdminI18n();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            if (user.role === "admin") router.replace("/admin");
            else if (user.role === "agent") router.replace("/agent");
        }
    }, [user, isLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.post("/auth/login", { email, password });
            login(res.data.user);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            console.error("Login failed:", err);
            setLoading(false);
            setError(e.response?.data?.error || e.response?.data?.message || t("login.invalidCredentials"));
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2), transparent 40%)" }} />
                <div className="relative z-10 max-w-md px-12 text-white">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur text-xl font-bold mb-6">C</span>
                    <h1 className="text-3xl font-semibold tracking-tight mb-3">{t("login.brandTitle")}</h1>
                    <p className="text-base text-white/90">{t("login.brandSubtitle")}</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
                <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
                    <div className="flex justify-end mb-2">
                        <LanguageSwitcher />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-6 text-center">
                        {t("login.heading")}
                    </h2>

                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label={t("login.email")} required>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </Field>

                        <Field label={t("login.password")} required>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </Field>

                        <Button type="submit" fullWidth size="lg" loading={loading}>
                            {loading ? t("login.submitting") : t("login.submit")}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
