'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/app/lib/api';

interface OnboardingPageProps {
    locale: string;
}

type OnboardingLocale = 'he' | 'en' | 'ru';

const COPY = {
    he: {
        title: 'השלמת פרטי משלוח וחשבונית',
        subtitle: 'לפני ההזמנה הראשונה נשארו כמה פרטים שחיוניים למשלוח ולחשבונית',
        company: 'החברה',
        address: 'כתובת משלוח',
        addressPlaceholder: 'רחוב ומספר',
        city: 'עיר',
        cityPlaceholder: 'עיר',
        billingAddress: 'כתובת לחשבונית',
        billingAddressPlaceholder: 'כתובת לחשבונית',
        sameAsShipping: 'זהה לכתובת המשלוח',
        billingEmail: 'אימייל לחשבוניות',
        contactRole: 'תפקיד בחברה (לא חובה)',
        contactRolePlaceholder: 'לדוגמה: מנהל רכש',
        submit: 'שמירה והמשך להזמנות',
        loading: 'שומר…',
        required: 'נא למלא את כל שדות החובה.',
        invalidEmail: 'נא להזין כתובת אימייל תקינה לחשבוניות.',
        genericError: 'לא הצלחנו לשמור את הפרטים. נסו שוב בעוד רגע.',
        note: 'לא ניתן לבצע הזמנה לפני השלמת הפרטים האלה.',
    },
    en: {
        title: 'Complete delivery & invoice details',
        subtitle: 'A few details essential for delivery and invoicing are needed before your first order',
        company: 'Company',
        address: 'Shipping address',
        addressPlaceholder: 'Street and number',
        city: 'City',
        cityPlaceholder: 'City',
        billingAddress: 'Invoice address',
        billingAddressPlaceholder: 'Invoice address',
        sameAsShipping: 'Same as shipping address',
        billingEmail: 'Invoice email',
        contactRole: 'Role in the company (optional)',
        contactRolePlaceholder: 'e.g. Purchasing manager',
        submit: 'Save and continue to orders',
        loading: 'Saving…',
        required: 'Please complete all required fields.',
        invalidEmail: 'Please enter a valid invoice email address.',
        genericError: "We couldn't save the details. Please try again shortly.",
        note: 'Orders cannot be placed before these details are completed.',
    },
    ru: {
        title: 'Данные доставки и счёта',
        subtitle: 'Перед первым заказом нужно заполнить данные, необходимые для доставки и счёта',
        company: 'Компания',
        address: 'Адрес доставки',
        addressPlaceholder: 'Улица и номер дома',
        city: 'Город',
        cityPlaceholder: 'Город',
        billingAddress: 'Адрес для счёта',
        billingAddressPlaceholder: 'Адрес для счёта',
        sameAsShipping: 'Совпадает с адресом доставки',
        billingEmail: 'Email для счетов',
        contactRole: 'Должность в компании (необязательно)',
        contactRolePlaceholder: 'например, менеджер по закупкам',
        submit: 'Сохранить и перейти к заказам',
        loading: 'Сохранение…',
        required: 'Заполните все обязательные поля.',
        invalidEmail: 'Введите корректный email для счетов.',
        genericError: 'Не удалось сохранить данные. Повторите попытку позже.',
        note: 'Оформление заказов недоступно, пока эти данные не заполнены.',
    },
} as const;

export default function OnboardingPage({ locale: rawLocale }: OnboardingPageProps) {
    const locale: OnboardingLocale = rawLocale === 'en' || rawLocale === 'ru' ? rawLocale : 'he';
    const t = COPY[locale];
    const isRTL = locale === 'he';
    const router = useRouter();

    const [profileLoading, setProfileLoading] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [sameAsShipping, setSameAsShipping] = useState(false);
    const [formData, setFormData] = useState({
        address: '',
        city: '',
        billingAddress: '',
        billingEmail: '',
        contactRole: '',
    });
    const [status, setStatus] = useState<'idle' | 'loading'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.get('/users/me')
            .then((res) => {
                if (cancelled) return;
                const userData = res.data?.data?.user;
                const company = userData?.company;
                if (!company) {
                    // Legacy accounts without a company keep using the profile
                    // tab inside the dashboard.
                    router.replace(`/${locale}/dashboard`);
                    return;
                }
                setCompanyName(company.name || '');
                setFormData({
                    address: company.address || '',
                    city: company.city || '',
                    billingAddress: company.billingAddress || '',
                    billingEmail: company.billingEmail || userData.email || '',
                    contactRole: userData.contactRole || '',
                });
                setProfileLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                router.replace(`/${locale}/auth?mode=login`);
            });
        return () => { cancelled = true; };
    }, [locale, router]);

    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData((current) => {
            const next = { ...current, [field]: value };
            if (field === 'address' && sameAsShipping) next.billingAddress = value;
            return next;
        });
        if (error) setError(null);
    };

    const toggleSameAsShipping = (checked: boolean) => {
        setSameAsShipping(checked);
        if (checked) {
            setFormData((current) => ({ ...current, billingAddress: current.address }));
        }
    };

    const validate = (): boolean => {
        if (!formData.address.trim() || !formData.city.trim() || !formData.billingAddress.trim() || !formData.billingEmail.trim()) {
            setError(t.required);
            return false;
        }
        if (!/^\S+@\S+\.\S+$/.test(formData.billingEmail.trim())) {
            setError(t.invalidEmail);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        if (!validate()) return;
        setStatus('loading');
        try {
            await api.patch('/v1/me/profile', {
                address: formData.address.trim(),
                city: formData.city.trim(),
                billingAddress: formData.billingAddress.trim(),
                billingEmail: formData.billingEmail.trim(),
                contactRole: formData.contactRole.trim(),
            });
            router.replace(`/${locale}/dashboard`);
        } catch {
            setError(t.genericError);
            setStatus('idle');
        }
    };

    if (profileLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
                <Loader2 className="animate-spin text-[#d4a83a]" size={36} aria-label={t.loading} />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex min-h-screen items-center justify-center px-5 py-16 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <Image src="/crystolia-logo.png" alt="Crystolia" width={48} height={48} className="rounded-full" />
                        <span className="text-2xl font-light tracking-tight text-slate-900">Crystolia</span>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.title}</h1>
                        <p className="mt-3 text-slate-600">{t.subtitle}</p>
                        {companyName && (
                            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                                <span className="sr-only">{t.company}: </span>
                                <span className="truncate">{companyName}</span>
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Field id="address" label={t.address}>
                            <input id="address" name="street-address" autoComplete="street-address" maxLength={200} required value={formData.address} onChange={(e) => updateField('address', e.target.value)} placeholder={t.addressPlaceholder} className="field-input" />
                        </Field>
                        <Field id="city" label={t.city}>
                            <input id="city" name="city" autoComplete="address-level2" maxLength={100} required value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder={t.cityPlaceholder} className="field-input" />
                        </Field>
                        <Field id="billingAddress" label={t.billingAddress}>
                            <input id="billingAddress" name="billingAddress" maxLength={200} required readOnly={sameAsShipping} value={formData.billingAddress} onChange={(e) => updateField('billingAddress', e.target.value)} placeholder={t.billingAddressPlaceholder} className="field-input read-only:bg-slate-50 read-only:text-slate-500" />
                            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={sameAsShipping}
                                    onChange={(e) => toggleSameAsShipping(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-[#d4a83a]"
                                />
                                {t.sameAsShipping}
                            </label>
                        </Field>
                        <Field id="billingEmail" label={t.billingEmail}>
                            <input id="billingEmail" name="billingEmail" type="email" inputMode="email" dir="ltr" maxLength={254} required value={formData.billingEmail} onChange={(e) => updateField('billingEmail', e.target.value)} placeholder="billing@company.com" className="field-input" />
                        </Field>
                        <Field id="contactRole" label={t.contactRole}>
                            <input id="contactRole" name="organization-title" autoComplete="organization-title" maxLength={80} value={formData.contactRole} onChange={(e) => updateField('contactRole', e.target.value)} placeholder={t.contactRolePlaceholder} className="field-input" />
                        </Field>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F5C542] px-8 py-4 text-base font-semibold text-[#3D2914] shadow-lg shadow-[#F5C542]/25 transition-colors duration-200 hover:bg-[#e5b832] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6508] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {status === 'loading' && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
                            {status === 'loading' ? t.loading : t.submit}
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
