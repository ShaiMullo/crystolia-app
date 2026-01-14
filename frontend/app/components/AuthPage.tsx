"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

interface AuthPageProps {
    locale: string;
}

export default function AuthPage({ locale }: AuthPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        companyName: "",
        phone: "",
        confirmPassword: "",
    });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push(`/${locale}/dashboard`);
        }
    }, [user, locale, router]);

    const isRTL = locale === "he";

    const translations = {
        he: {
            login: "כניסה לאזור לקוחות",
            signup: "הרשמה לעסקים",
            email: "אימייל",
            password: "סיסמה",
            confirmPassword: "אימות סיסמה",
            companyName: "שם החברה",
            phone: "טלפון",
            submitLogin: "כניסה",
            submitSignup: "הרשמה",
            or: "או",
            continueWith: "המשך עם",
            google: "Google",
            apple: "Apple",
            noAccount: "אין לך חשבון?",
            hasAccount: "יש לך חשבון?",
            signupNow: "הירשם עכשיו",
            loginNow: "התחבר עכשיו",
            forgotPassword: "שכחת סיסמה?",
            backToSite: "חזרה לאתר",
            businessPortal: "אזור עסקים",
            subtitle: "ניהול הזמנות וחשבוניות במקום אחד",
        },
        en: {
            login: "Business Login",
            signup: "Business Registration",
            email: "Email",
            password: "Password",
            confirmPassword: "Confirm Password",
            companyName: "Company Name",
            phone: "Phone",
            submitLogin: "Login",
            submitSignup: "Sign Up",
            or: "or",
            continueWith: "Continue with",
            google: "Google",
            apple: "Apple",
            noAccount: "Don't have an account?",
            hasAccount: "Already have an account?",
            signupNow: "Sign up now",
            loginNow: "Login now",
            forgotPassword: "Forgot password?",
            backToSite: "Back to site",
            businessPortal: "Business Portal",
            subtitle: "Manage orders and invoices in one place",
        },
        ru: {
            login: "Вход для бизнеса",
            signup: "Регистрация бизнеса",
            email: "Электронная почта",
            password: "Пароль",
            confirmPassword: "Подтвердите пароль",
            companyName: "Название компании",
            phone: "Телефон",
            submitLogin: "Войти",
            submitSignup: "Зарегистрироваться",
            or: "или",
            continueWith: "Продолжить с",
            google: "Google",
            apple: "Apple",
            noAccount: "Нет аккаунта?",
            hasAccount: "Уже есть аккаунт?",
            signupNow: "Зарегистрируйтесь",
            loginNow: "Войти",
            forgotPassword: "Забыли пароль?",
            backToSite: "Назад на сайт",
            businessPortal: "Бизнес-портал",
            subtitle: "Управление заказами и счетами в одном месте",
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.he;

    const [error, setError] = useState<string | null>(null);
    const { login, register } = useAuth();
    // Use useRouter to get access to navigation
    // Note: router is already used inside AuthContext but we might need it for specific error handling

    // Parse names from single company/contact field or ask user to split
    // For now we will use simple defaults or update the form to match backend DTO

    // Helper to validate inputs
    const validateForm = () => {
        if (!formData.email || !formData.password) return false;
        if (!isLogin) {
            if (formData.password !== formData.confirmPassword) {
                setError(isRTL ? "הסיסמאות אינן תואמות" : "Passwords do not match");
                return false;
            }
            if (!formData.companyName || !formData.phone) return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) return;

        setStatus("loading");

        try {
            if (isLogin) {
                await login({
                    email: formData.email,
                    password: formData.password
                });
            } else {
                // Split company name to first/last name for now as placeholder
                // In real app, we should probably have separate fields
                const nameParts = formData.companyName.split(' ');
                const firstName = nameParts[0] || 'Business';
                const lastName = nameParts.slice(1).join(' ') || 'User';

                await register({
                    email: formData.email,
                    password: formData.password,
                    firstName: firstName,
                    lastName: lastName,
                    phone: formData.phone,
                    role: 'customer' // Default role
                });
            }
            setStatus("success");
            // Redirect happens in AuthContext
        } catch (err: any) {
            console.error(err);
            setStatus("error");
            setError(
                isRTL
                    ? "אירעה שגיאה בהתחברות. אנא נסה שוב."
                    : "Login failed. Please try again."
            );
        } finally {
            if (status !== "success") setStatus("idle");
        }
    };

    const handleSocialLogin = (provider: string) => {
        // TODO: Implement OAuth
        console.log(`Login with ${provider}`);
    };

    return (
        <div className={`min-h-screen flex ${isRTL ? "rtl" : "ltr"}`}>
            {/* Left Side - Image/Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#F5C542] to-[#d4a83a]">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image
                        src="/sunflower-bg.jpg"
                        alt="Sunflower field"
                        fill
                        className="object-cover opacity-30"
                    />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative w-16 h-16">
                            <Image
                                src="/crystolia-logo.png"
                                alt="Crystolia"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="text-4xl font-light tracking-tight">Crystolia</span>
                    </div>

                    <h2 className="text-3xl font-extralight text-center mb-4">
                        {t.businessPortal}
                    </h2>
                    <p className="text-lg font-light text-white/80 text-center max-w-md">
                        {t.subtitle}
                    </p>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-12 left-12">
                        <div className="text-6xl">🌻</div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 bg-white relative">
                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center gap-3 mb-8">
                    <div className="relative w-10 h-10">
                        <Image
                            src="/crystolia-logo.png"
                            alt="Crystolia"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="text-2xl font-light tracking-tight text-gray-900">
                        Crystolia
                    </span>
                </div>

                {/* Back to Site Link */}
                <Link
                    href={`/${locale}`}
                    className="absolute top-6 right-6 text-sm font-light text-gray-500 hover:text-[#F5C542] transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t.backToSite}
                </Link>

                <div className="w-full max-w-md">
                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-gray-900 mb-8 text-center">
                        {isLogin ? t.login : t.signup}
                    </h1>

                    {/* Social Login Buttons */}
                    <div className="space-y-3 mb-8">
                        {/* Google Button */}
                        <button
                            onClick={() => handleSocialLogin("google")}
                            className="w-full px-6 py-3.5 bg-white border border-gray-200 rounded-xl font-light text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {t.continueWith} {t.google}
                        </button>

                        {/* Apple Button */}
                        <button
                            onClick={() => handleSocialLogin("apple")}
                            className="w-full px-6 py-3.5 bg-black text-white rounded-xl font-light hover:bg-gray-900 transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            {t.continueWith} {t.apple}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500 font-light">{t.or}</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-light flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Company Name (Signup only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-light text-gray-700 mb-2">
                                    {t.companyName}
                                </label>
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                    placeholder="שם החברה / העסק"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">
                                {t.email}
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                placeholder="example@company.com"
                            />
                        </div>

                        {/* Phone (Signup only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-light text-gray-700 mb-2">
                                    {t.phone}
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                    placeholder="05X-XXX-XXXX"
                                />
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-light text-gray-700 mb-2">
                                {t.password}
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Confirm Password (Signup only) */}
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-light text-gray-700 mb-2">
                                    {t.confirmPassword}
                                </label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {/* Forgot Password (Login only) */}
                        {isLogin && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    className="text-sm font-light text-[#F5C542] hover:text-[#d4a83a] transition-colors"
                                >
                                    {t.forgotPassword}
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full px-8 py-4 bg-[#F5C542] text-white rounded-full font-light text-base tracking-wide hover:bg-[#d4a83a] transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {status === "loading" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Loading...
                                </span>
                            ) : (
                                isLogin ? t.submitLogin : t.submitSignup
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <p className="mt-8 text-center text-sm font-light text-gray-600">
                        {isLogin ? t.noAccount : t.hasAccount}{" "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[#F5C542] hover:text-[#d4a83a] font-medium transition-colors"
                        >
                            {isLogin ? t.signupNow : t.loginNow}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
