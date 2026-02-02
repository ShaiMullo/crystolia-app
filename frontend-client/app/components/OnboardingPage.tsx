'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface OnboardingPageProps {
    locale: string;
}

const translations = {
    he: {
        title: "השלמת פרטי עסק",
        subtitle: "כדי להתחיל להשתמש בשירות, אנא מלא את פרטי העסק שלך",
        businessName: "שם העסק",
        businessId: "ח.פ / מספר עוסק",
        address: "כתובת",
        city: "עיר",
        phone: "טלפון",
        submit: "שמור והמשך",
        skip: "דלג (אפשר למלא מאוחר יותר)",
        required: "שדה חובה"
    },
    en: {
        title: "Complete Business Details",
        subtitle: "To start using the service, please fill in your business details",
        businessName: "Business Name",
        businessId: "Business ID / VAT Number",
        address: "Address",
        city: "City",
        phone: "Phone",
        submit: "Save and Continue",
        skip: "Skip (can fill later)",
        required: "Required field"
    }
};

export default function OnboardingPage({ locale }: OnboardingPageProps) {
    const t = translations[locale as keyof typeof translations] || translations.he;
    const router = useRouter();
    const { user, updateUser } = useAuth();

    const [formData, setFormData] = useState({
        businessName: '',
        businessId: '',
        address: '',
        city: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.businessName.trim()) {
            newErrors.businessName = t.required;
        }
        if (!formData.businessId.trim()) {
            newErrors.businessId = t.required;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/customers/onboarding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    userId: user?._id
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update local user state to mark onboarding as complete
                if (updateUser) {
                    updateUser({ ...user, onboardingComplete: true, customer: data.customer });
                }
                router.push(`/${locale}/dashboard`);
            } else {
                console.error('Onboarding failed');
            }
        } catch (error) {
            console.error('Onboarding error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.push(`/${locale}/dashboard`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl">🌻</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">{t.title}</h1>
                    <p className="text-gray-600 text-sm">{t.subtitle}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Business Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.businessName} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all ${errors.businessName ? 'border-red-500' : 'border-gray-200'
                                }`}
                            placeholder="לדוגמה: קריסטוליה בע״מ"
                        />
                        {errors.businessName && (
                            <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>
                        )}
                    </div>

                    {/* Business ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.businessId} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="businessId"
                            value={formData.businessId}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all ${errors.businessId ? 'border-red-500' : 'border-gray-200'
                                }`}
                            placeholder="לדוגמה: 515123456"
                        />
                        {errors.businessId && (
                            <p className="text-red-500 text-xs mt-1">{errors.businessId}</p>
                        )}
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.address}
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                            placeholder="רחוב ומספר"
                        />
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.city}
                        </label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                            placeholder="עיר"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.phone}
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                            placeholder="050-1234567"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-500 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                        {loading ? '...' : t.submit}
                    </button>

                    {/* Skip Link */}
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="w-full text-center text-gray-500 text-sm hover:text-gray-700 transition-colors"
                    >
                        {t.skip}
                    </button>
                </form>
            </div>
        </div>
    );
}
