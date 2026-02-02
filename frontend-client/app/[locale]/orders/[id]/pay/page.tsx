
"use client";

import { useState, useEffect } from "react";
import api from "@/app/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PageProps {
    params: Promise<{ locale: string; id: string }> | { locale: string; id: string };
}

export default function OrderPaymentPage({ params }: PageProps) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [locale, setLocale] = useState("he");

    useEffect(() => {
        const fetchOrder = async () => {
            const resolvedParams = await Promise.resolve(params);
            setLocale(resolvedParams.locale);
            try {
                const { data } = await api.get(`/orders/${resolvedParams.id}`);
                setOrder(data);
            } catch (error) {
                toast.error("לא ניתן לטעון את ההזמנה");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params]);

    const handlePaymentMethod = async (method: string) => {
        if (!order) return;
        try {
            // Update Method
            await api.patch(`/orders/${order._id}/payment-method`, { paymentMethod: method });

            if (method === 'CREDIT_CARD') {
                // Determine if we redirect to a payment page or show a mock frame
                // For now, let's assume we call a create payment endpoint that returns a URL
                const { data: paymentData } = await api.post('/payments/create', { orderId: order._id, provider: 'hyp' });
                if (paymentData.redirectUrl) {
                    window.location.href = paymentData.redirectUrl;
                } else {
                    toast.success("מעבר לתשלום...");
                }
            } else {
                toast.success("אמצעי התשלום עודכן בהצלחה!");
                router.push(`/${locale}/dashboard`);
            }
        } catch (error) {
            toast.error("שגיאה בעדכון אמצעי התשלום");
            console.error(error);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
    if (!order) return <div className="min-h-screen flex items-center justify-center">הזמנה לא נמצאה</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir={locale === 'he' ? 'rtl' : 'ltr'}>
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-[#F5C542] px-6 py-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">תשלום עבור הזמנה</h2>
                    <p className="text-white/90 font-mono">#{order._id.slice(-6).toUpperCase()}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-gray-500 mb-1">סכום לתשלום</p>
                        <p className="text-4xl font-light text-gray-900">₪{order.finalPrice?.toLocaleString() || order.totalAmount?.toLocaleString()}</p>
                    </div>

                    <div className="space-y-4 pt-6">
                        <button
                            onClick={() => handlePaymentMethod('CREDIT_CARD')}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-[#F5C542] bg-[#F5C542]/5 hover:bg-[#F5C542] text-[#d4a83a] hover:text-white rounded-2xl transition-all duration-300 group"
                        >
                            <span className="text-2xl">💳</span>
                            <span className="font-medium group-hover:scale-105 transition-transform">כרטיס אשראי</span>
                        </button>

                        <button
                            onClick={() => handlePaymentMethod('BANK_TRANSFER')}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl transition-all duration-300"
                        >
                            <span className="text-2xl">🏦</span>
                            <span className="font-medium">העברה בנקאית</span>
                        </button>

                        <button
                            onClick={() => handlePaymentMethod('CASH')}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl transition-all duration-300"
                        >
                            <span className="text-2xl">💵</span>
                            <span className="font-medium">מזומן לשליח</span>
                        </button>
                    </div>

                    <button
                        onClick={() => router.back()}
                        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-6"
                    >
                        חזרה לדאשבורד
                    </button>
                </div>
            </div>
        </div>
    );
}
