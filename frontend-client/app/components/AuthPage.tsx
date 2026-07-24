"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Clock3, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { COUNTRIES, isValidCompanyNumber } from "../lib/countries";

type AuthLocale = "he" | "en" | "ru";

interface AuthPageProps {
    locale: string;
}

const COPY = {
    he: {
        login: "כניסה לאזור העסקים",
        signup: "הרשמה לאזור העסקים",
        contactName: "שם מלא של איש הקשר",
        contactNamePlaceholder: "לדוגמה: ישראל ישראלי",
        email: "אימייל",
        password: "סיסמה",
        confirmPassword: "אימות סיסמה",
        companyName: "שם משפטי/מסחרי של החברה",
        companyPlaceholder: "שם החברה או העסק",
        country: "מדינה",
        countryPlaceholder: "בחרו מדינה",
        companyNumberIL: "ח.פ. / עוסק מורשה",
        companyNumberIntl: "VAT / Tax ID",
        companyNumberPlaceholderIL: "לדוגמה: 515123456",
        companyNumberPlaceholderIntl: "VAT / Tax ID",
        invalidCompanyNumberIL: "נא להזין ח.פ. / עוסק מורשה תקין (8–9 ספרות).",
        invalidCompanyNumberIntl: "נא להזין מספר VAT / Tax ID תקין.",
        phone: "טלפון",
        submitLogin: "כניסה",
        submitSignup: "שליחת הרשמה לאישור",
        loading: "שולח…",
        or: "או",
        continueWithGoogle: "המשך עם Google",
        noAccount: "אין לך חשבון?",
        hasAccount: "כבר נרשמת?",
        signupNow: "הרשמה לעסקים",
        loginNow: "כניסה לחשבון",
        forgotPassword: "שכחת סיסמה?",
        forgotSent: "אם קיים חשבון מתאים, שלחנו אליו קישור מאובטח לאיפוס הסיסמה. כדאי לבדוק גם בתיקיית הספאם.",
        enterEmailFirst: "נא להזין קודם את כתובת האימייל של החשבון.",
        backToSite: "חזרה לאתר",
        businessPortal: "אזור העסקים של Crystolia",
        subtitle: "מבצעים הזמנות ועוקבים אחריהן במקום אחד",
        passwordHint: "לפחות 8 תווים, אות גדולה ומספר",
        required: "נא למלא את כל השדות.",
        invalidPhone: "נא להזין מספר טלפון תקין.",
        invalidPassword: "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה ומספר.",
        passwordMismatch: "הסיסמאות אינן תואמות.",
        invalidCredentials: "האימייל או הסיסמה אינם נכונים.",
        emailExists: "כבר קיימת הרשמה עם כתובת האימייל הזאת.",
        genericError: "לא הצלחנו להשלים את הפעולה. נסו שוב בעוד רגע.",
        pendingLoginError: "החשבון עדיין ממתין לאישור צוות קריסטוליה.",
        googleAuthFailed: "ההתחברות עם Google לא הושלמה. אפשר לנסות שוב או להשתמש באימייל וסיסמה.",
        googleUnavailable: "ההרשמה עם Google עדיין אינה זמינה. אפשר להירשם עם אימייל וסיסמה.",
        googleAccountExists: "כתובת האימייל הזאת כבר רשומה עם סיסמה. התחברו עם האימייל והסיסמה שלכם.",
        accountUnavailable: "לא ניתן להתחבר עם החשבון הזה. לפרטים אפשר לפנות לצוות קריסטוליה.",
        registrationExpired: "תוקף תהליך ההרשמה פג. התחילו שוב עם כפתור Google.",
        pendingTitle: "ההרשמה התקבלה",
        pendingBody: "שלחנו אליך מייל אישור קבלה. איש צוות מקריסטוליה יעבור על הפרטים ויאשר את החשבון.",
        pendingBodyWithoutEmail: "איש צוות מקריסטוליה יעבור על הפרטים ויאשר את החשבון. בקשת ההרשמה נשמרה בהצלחה.",
        pendingAccess: "עד לאישור, לא ניתן להתחבר או לבצע הזמנות. אין צורך להירשם שוב.",
        pendingEmail: "נעדכן אתכם במייל ברגע שהחשבון יהיה מוכן.",
        pendingEmailWithoutEmail: "צוות קריסטוליה יעדכן אתכם כשהחשבון יהיה מוכן.",
        pendingBackToLogin: "חזרה למסך הכניסה",
    },
    en: {
        login: "Business portal login",
        signup: "Business portal registration",
        contactName: "Contact full name",
        contactNamePlaceholder: "For example: John Smith",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm password",
        companyName: "Company legal/trade name",
        companyPlaceholder: "Company or business name",
        country: "Country",
        countryPlaceholder: "Select a country",
        companyNumberIL: "Company number (ח.פ.)",
        companyNumberIntl: "VAT / Tax ID",
        companyNumberPlaceholderIL: "e.g. 515123456",
        companyNumberPlaceholderIntl: "VAT / Tax ID",
        invalidCompanyNumberIL: "Please enter a valid Israeli company number (8-9 digits).",
        invalidCompanyNumberIntl: "Please enter a valid VAT / Tax ID.",
        phone: "Phone",
        submitLogin: "Sign in",
        submitSignup: "Submit registration for approval",
        loading: "Submitting…",
        or: "or",
        continueWithGoogle: "Continue with Google",
        noAccount: "Don't have an account?",
        hasAccount: "Already registered?",
        signupNow: "Register your business",
        loginNow: "Sign in",
        forgotPassword: "Forgot password?",
        forgotSent: "If an eligible account exists, we sent it a secure reset link. Please also check your spam folder.",
        enterEmailFirst: "Enter your account email address first.",
        backToSite: "Back to website",
        businessPortal: "Crystolia Business Portal",
        subtitle: "Place and track orders in one place",
        passwordHint: "At least 8 characters, one uppercase letter and one number",
        required: "Please complete all fields.",
        invalidPhone: "Please enter a valid phone number.",
        invalidPassword: "Password must contain at least 8 characters, one uppercase letter and one number.",
        passwordMismatch: "Passwords do not match.",
        invalidCredentials: "The email or password is incorrect.",
        emailExists: "A registration with this email address already exists.",
        genericError: "We couldn't complete the request. Please try again shortly.",
        pendingLoginError: "This account is still awaiting approval by the Crystolia team.",
        googleAuthFailed: "Sign-in with Google did not complete. Try again or use email and password.",
        googleUnavailable: "Google registration is not available yet. You can register with email and password.",
        googleAccountExists: "This email address is already registered with a password. Sign in with your email and password.",
        accountUnavailable: "This account cannot be used to sign in. Contact the Crystolia team for details.",
        registrationExpired: "The registration session expired. Start again with the Google button.",
        pendingTitle: "Registration received",
        pendingBody: "We sent you a confirmation email. A member of the Crystolia team will review the details and approve the account.",
        pendingBodyWithoutEmail: "A member of the Crystolia team will review the details and approve the account. Your registration request was saved successfully.",
        pendingAccess: "Until approval, sign-in and ordering remain locked. There is no need to register again.",
        pendingEmail: "We'll email you as soon as the account is ready.",
        pendingEmailWithoutEmail: "The Crystolia team will update you when the account is ready.",
        pendingBackToLogin: "Back to sign in",
    },
    ru: {
        login: "Вход в бизнес-портал",
        signup: "Регистрация в бизнес-портале",
        contactName: "Имя контактного лица",
        contactNamePlaceholder: "Например: Иван Иванов",
        email: "Электронная почта",
        password: "Пароль",
        confirmPassword: "Подтвердите пароль",
        companyName: "Юридическое/торговое название компании",
        companyPlaceholder: "Название компании или бизнеса",
        country: "Страна",
        countryPlaceholder: "Выберите страну",
        companyNumberIL: "Номер компании (ח.פ.)",
        companyNumberIntl: "VAT / налоговый номер",
        companyNumberPlaceholderIL: "например, 515123456",
        companyNumberPlaceholderIntl: "VAT / Tax ID",
        invalidCompanyNumberIL: "Введите корректный израильский номер компании (8–9 цифр).",
        invalidCompanyNumberIntl: "Введите корректный VAT / налоговый номер.",
        phone: "Телефон",
        submitLogin: "Войти",
        submitSignup: "Отправить регистрацию на проверку",
        loading: "Отправка…",
        or: "или",
        continueWithGoogle: "Продолжить с Google",
        noAccount: "Нет аккаунта?",
        hasAccount: "Уже зарегистрированы?",
        signupNow: "Зарегистрировать бизнес",
        loginNow: "Войти",
        forgotPassword: "Забыли пароль?",
        forgotSent: "Если подходящий аккаунт существует, мы отправили защищённую ссылку для сброса. Проверьте также папку «Спам».",
        enterEmailFirst: "Сначала введите адрес электронной почты аккаунта.",
        backToSite: "Вернуться на сайт",
        businessPortal: "Бизнес-портал Crystolia",
        subtitle: "Оформляйте и отслеживайте заказы в одном месте",
        passwordHint: "Не менее 8 символов, заглавная буква и цифра",
        required: "Заполните все поля.",
        invalidPhone: "Введите корректный номер телефона.",
        invalidPassword: "Пароль должен содержать не менее 8 символов, заглавную букву и цифру.",
        passwordMismatch: "Пароли не совпадают.",
        invalidCredentials: "Неверный адрес электронной почты или пароль.",
        emailExists: "Регистрация с этим адресом электронной почты уже существует.",
        genericError: "Не удалось выполнить запрос. Повторите попытку позже.",
        pendingLoginError: "Аккаунт ещё ожидает подтверждения командой Crystolia.",
        googleAuthFailed: "Вход через Google не был завершён. Попробуйте снова или используйте электронную почту и пароль.",
        googleUnavailable: "Регистрация через Google пока недоступна. Используйте электронную почту и пароль.",
        googleAccountExists: "Этот адрес уже зарегистрирован с паролем. Войдите с адресом электронной почты и паролем.",
        accountUnavailable: "Вход с этим аккаунтом невозможен. За подробностями обратитесь к команде Crystolia.",
        registrationExpired: "Сессия регистрации истекла. Начните заново с кнопки Google.",
        pendingTitle: "Регистрация получена",
        pendingBody: "Мы отправили вам подтверждение по электронной почте. Сотрудник Crystolia проверит данные и подтвердит аккаунт.",
        pendingBodyWithoutEmail: "Сотрудник Crystolia проверит данные и подтвердит аккаунт. Ваша заявка на регистрацию успешно сохранена.",
        pendingAccess: "До подтверждения вход и оформление заказов недоступны. Повторно регистрироваться не нужно.",
        pendingEmail: "Мы сообщим по электронной почте, когда аккаунт будет готов.",
        pendingEmailWithoutEmail: "Команда Crystolia сообщит вам, когда аккаунт будет готов.",
        pendingBackToLogin: "Вернуться ко входу",
    },
} as const;

function landingUrl(locale: AuthLocale): string {
    if (locale === "he") return "https://crystolia.co.il/he";
    if (locale === "ru") return "https://crystolia.ru/ru";
    return "https://crystolia.com/en";
}

export default function AuthPage({ locale: rawLocale }: AuthPageProps) {
    const locale: AuthLocale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : "he";
    const t = COPY[locale];
    const isRTL = locale === "he";
    const [isLogin, setIsLogin] = useState(true);
    const [registrationPending, setRegistrationPending] = useState(false);
    const [registrationEmailSent, setRegistrationEmailSent] = useState(false);
    const [pendingAddress, setPendingAddress] = useState("");
    const [formData, setFormData] = useState({
        contactName: "",
        companyName: "",
        email: "",
        phone: "",
        country: "",
        vatNumber: "",
        password: "",
        confirmPassword: "",
    });
    const [status, setStatus] = useState<"idle" | "loading">("idle");
    const [error, setError] = useState<string | null>(null);
    const [forgotSent, setForgotSent] = useState(false);
    const [googleAvailable, setGoogleAvailable] = useState(false);
    const { user, login, register, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "register") setIsLogin(false);
        if (params.get("status") === "pending") setRegistrationPending(true);
        const oauthError = params.get("error");
        if (oauthError === "google_auth_failed") setError(t.googleAuthFailed);
        else if (oauthError === "account_exists") setError(t.googleAccountExists);
        else if (oauthError === "account_unavailable") setError(t.accountUnavailable);
        else if (oauthError === "registration_expired") setError(t.registrationExpired);
        else if (oauthError === "google_unavailable") setError(t.googleUnavailable);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/capabilities", { credentials: "include" })
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => {
                if (!cancelled) setGoogleAvailable(payload?.data?.google === true);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        // Wait for the /auth/me session check — a stale localStorage seed must
        // not bounce a logged-out visitor into the dashboard.
        if (authLoading || !user) return;
        router.replace(`/${locale}/dashboard`);
    }, [user, authLoading, locale, router]);

    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
        if (error) setError(null);
    };

    const validate = (): boolean => {
        const email = formData.email.trim();
        const password = formData.password;
        if (!email || !password) {
            setError(t.required);
            return false;
        }
        if (isLogin) return true;
        if (
            !formData.contactName.trim() ||
            !formData.companyName.trim() ||
            !formData.phone.trim() ||
            !formData.country ||
            !formData.vatNumber.trim() ||
            !formData.confirmPassword
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
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            setError(t.invalidPassword);
            return false;
        }
        if (password !== formData.confirmPassword) {
            setError(t.passwordMismatch);
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
            if (isLogin) {
                await login({ email: formData.email.trim(), password: formData.password });
                return;
            }

            const registration = await register({
                name: formData.contactName.trim(),
                companyName: formData.companyName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                country: formData.country,
                vatNumber: formData.vatNumber.trim(),
                password: formData.password,
                locale,
            });
            setPendingAddress(formData.email.trim());
            setRegistrationEmailSent(registration.emailNotificationSent);
            setRegistrationPending(true);
            setFormData((current) => ({ ...current, password: "", confirmPassword: "" }));
        } catch (caught: unknown) {
            const serverMessage = (caught as { response?: { data?: { error?: string } } }).response?.data?.error || "";
            if (serverMessage === "Account is awaiting approval") setError(t.pendingLoginError);
            else if (serverMessage === "Incorrect email or password") setError(t.invalidCredentials);
            else if (serverMessage === "Email already exists" || serverMessage.includes("Duplicate value")) setError(t.emailExists);
            else setError(t.genericError);
        } finally {
            setStatus("idle");
        }
    };

    const handleForgotPassword = async () => {
        const email = formData.email.trim();
        setError(null);
        setForgotSent(false);
        if (!email) {
            setError(t.enterEmailFirst);
            return;
        }
        setStatus("loading");
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, locale }),
            });
            if (!response.ok) throw new Error("Request failed");
            setForgotSent(true);
        } catch {
            setError(t.genericError);
        } finally {
            setStatus("idle");
        }
    };

    const switchMode = (loginMode: boolean) => {
        setIsLogin(loginMode);
        setRegistrationPending(false);
        setRegistrationEmailSent(false);
        setForgotSent(false);
        setError(null);
        const nextUrl = `/${locale}/auth?mode=${loginMode ? "login" : "register"}`;
        window.history.replaceState(null, "", nextUrl);
    };

    return (
        <main className="min-h-screen bg-white" dir={isRTL ? "rtl" : "ltr"}>
            <div className="min-h-screen lg:grid lg:grid-cols-2">
                <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#8b6508] via-[#d4a83a] to-[#f5c542] lg:flex lg:items-center lg:justify-center">
                    <Image src="/sunflower-bg.jpg" alt="" fill priority className="object-cover opacity-25" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-[#3D2914]/35" />
                    <div className="relative z-10 max-w-lg px-12 text-center text-white">
                        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-2xl">
                            <Image src="/crystolia-logo.png" alt="Crystolia" width={80} height={80} className="h-full w-full object-cover" />
                        </div>
                        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Crystolia</p>
                        <h2 className="text-4xl font-light tracking-tight">{t.businessPortal}</h2>
                        <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-white/90">{t.subtitle}</p>
                        <div className="mx-auto mt-10 grid max-w-sm grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                <Building2 className="mx-auto mb-2" aria-hidden="true" />
                                {t.companyName}
                            </div>
                            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                                <ShieldCheck className="mx-auto mb-2" aria-hidden="true" />
                                {isLogin ? t.submitLogin : t.submitSignup}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative flex min-h-screen items-center justify-center px-5 py-24 sm:px-10">
                    <a
                        href={landingUrl(locale)}
                        className="absolute top-6 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a] start-5 sm:start-8"
                    >
                        {isRTL ? <ArrowRight size={18} aria-hidden="true" /> : <ArrowLeft size={18} aria-hidden="true" />}
                        {t.backToSite}
                    </a>

                    <div className="w-full max-w-md">
                        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                            <Image src="/crystolia-logo.png" alt="Crystolia" width={48} height={48} className="rounded-full" />
                            <span className="text-2xl font-light tracking-tight text-slate-900">Crystolia</span>
                        </div>

                        {registrationPending ? (
                            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-7 text-center shadow-sm sm:p-9" role="status">
                                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5C542]/25 text-[#8b6508]">
                                    <Clock3 size={30} aria-hidden="true" />
                                </span>
                                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">{t.pendingTitle}</h1>
                                <p className="mt-4 text-base leading-7 text-slate-700">
                                    {registrationEmailSent ? t.pendingBody : t.pendingBodyWithoutEmail}
                                </p>
                                {pendingAddress && (
                                    <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                                        <Mail size={16} aria-hidden="true" />
                                        <span className="truncate" dir="ltr">{pendingAddress}</span>
                                    </p>
                                )}
                                <p className="mt-5 text-sm leading-6 text-slate-600">{t.pendingAccess}</p>
                                <p className="mt-2 text-sm font-medium text-[#8b6508]">
                                    {registrationEmailSent ? t.pendingEmail : t.pendingEmailWithoutEmail}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => switchMode(true)}
                                    className="mt-7 min-h-12 w-full cursor-pointer rounded-full border border-[#d4a83a] bg-white px-6 py-3 font-semibold text-[#7c5907] transition-colors duration-200 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a] focus-visible:ring-offset-2"
                                >
                                    {t.pendingBackToLogin}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8 text-center">
                                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                        {isLogin ? t.login : t.signup}
                                    </h1>
                                    <p className="mt-3 text-slate-600">{t.subtitle}</p>
                                </div>

                                {googleAvailable && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => { window.location.href = `/api/auth/google?locale=${locale}`; }}
                                            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a]"
                                        >
                                            <span aria-hidden="true" className="font-bold text-[#4285F4]">G</span>
                                            {t.continueWithGoogle}
                                        </button>
                                        <div className="relative my-7">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                                            <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-slate-500">{t.or}</span></div>
                                        </div>
                                    </>
                                )}

                                {error && (
                                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
                                        {error}
                                    </div>
                                )}
                                {forgotSent && (
                                    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900" role="status">
                                        {t.forgotSent}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {!isLogin && (
                                        <>
                                            <Field id="contactName" label={t.contactName}>
                                                <input id="contactName" name="name" autoComplete="name" maxLength={120} required value={formData.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder={t.contactNamePlaceholder} className="field-input" />
                                            </Field>
                                            <Field id="companyName" label={t.companyName}>
                                                <input id="companyName" name="organization" autoComplete="organization" maxLength={160} required value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder={t.companyPlaceholder} className="field-input" />
                                            </Field>
                                        </>
                                    )}

                                    <Field id="email" label={t.email}>
                                        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" maxLength={254} required value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="name@company.com" className="field-input" />
                                    </Field>

                                    {!isLogin && (
                                        <>
                                            <Field id="phone" label={t.phone}>
                                                <input id="phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={32} required value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="05X-XXX-XXXX" className="field-input" />
                                            </Field>
                                            <Field id="country" label={t.country}>
                                                <select
                                                    id="country"
                                                    name="country"
                                                    autoComplete="country"
                                                    required
                                                    value={formData.country}
                                                    onChange={(e) => updateField("country", e.target.value)}
                                                    className="field-input"
                                                >
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
                                                    placeholder={formData.country === "IL" || !formData.country ? t.companyNumberPlaceholderIL : t.companyNumberPlaceholderIntl}
                                                    className="field-input"
                                                />
                                            </Field>
                                        </>
                                    )}

                                    <Field id="password" label={t.password} hint={!isLogin ? t.passwordHint : undefined}>
                                        <input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={8} required value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="••••••••" className="field-input" />
                                    </Field>

                                    {!isLogin && (
                                        <Field id="confirmPassword" label={t.confirmPassword}>
                                            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="••••••••" className="field-input" />
                                        </Field>
                                    )}

                                    {isLogin && (
                                        <div className="text-end">
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                disabled={status === "loading"}
                                                className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-medium text-[#8b6508] transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {t.forgotPassword}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={status === "loading"}
                                        className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F5C542] px-8 py-4 text-base font-semibold text-[#3D2914] shadow-lg shadow-[#F5C542]/25 transition-colors duration-200 hover:bg-[#e5b832] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6508] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {status === "loading" && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
                                        {status === "loading" ? t.loading : isLogin ? t.submitLogin : t.submitSignup}
                                    </button>
                                </form>

                                <p className="mt-8 text-center text-sm text-slate-600">
                                    {isLogin ? t.noAccount : t.hasAccount}{" "}
                                    <button type="button" onClick={() => switchMode(!isLogin)} className="min-h-11 cursor-pointer rounded-lg px-2 font-semibold text-[#8b6508] transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a83a]">
                                        {isLogin ? t.signupNow : t.loginNow}
                                    </button>
                                </p>
                            </>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
            {children}
            {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
        </div>
    );
}
