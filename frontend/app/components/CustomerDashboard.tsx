"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface CustomerDashboardProps {
    locale: string;
}

// Mock data - will be replaced with real data from API
const mockOrders = [
    { id: "12345", date: "2026-01-14", status: "paid", total: 1200, items: "ארגז 1L x 10, ארגז 5L x 5" },
    { id: "12344", date: "2026-01-10", status: "shipped", total: 2500, items: "ארגז 5L x 10" },
    { id: "12343", date: "2026-01-05", status: "delivered", total: 850, items: "ארגז 1L x 5" },
];

const mockInvoices = [
    { id: "INV-123", date: "2026-01-14", amount: 1200, orderId: "12345" },
    { id: "INV-122", date: "2026-01-10", amount: 2500, orderId: "12344" },
    { id: "INV-121", date: "2026-01-05", amount: 850, orderId: "12343" },
];

const mockProfile = {
    companyName: "חברת דוגמה בע״מ",
    taxId: "123456789",
    email: "info@example.com",
    phone: "050-1234567",
    address: "רחוב הראשי 123",
    city: "תל אביב",
    profileImage: null as string | null,
};

export default function CustomerDashboard({ locale }: CustomerDashboardProps) {
    const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "profile" | "newOrder">("orders");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [profile, setProfile] = useState(mockProfile);
    const [orderQuantities, setOrderQuantities] = useState({ "1L": 0, "5L": 0, "18L": 0 });
    const isRTL = locale === "he";

    const translations = {
        he: {
            welcome: "שלום",
            newOrder: "הזמנה חדשה",
            myOrders: "ההזמנות שלי",
            invoices: "חשבוניות",
            profile: "הפרטים שלי",
            logout: "יציאה",
            orderNumber: "מספר הזמנה",
            date: "תאריך",
            status: "סטטוס",
            total: "סה״כ",
            items: "פריטים",
            actions: "פעולות",
            view: "צפה",
            download: "הורד PDF",
            statuses: {
                pending: "ממתין לאישור",
                approved: "אושר",
                paid: "שולם",
                shipped: "נשלח",
                delivered: "נמסר",
            },
            invoiceNumber: "מספר חשבונית",
            amount: "סכום",
            orderRef: "הזמנה",
            profileTitle: "פרטי החברה",
            companyNameLabel: "שם החברה",
            taxId: "ח.פ / ע.מ",
            email: "אימייל",
            phone: "טלפון",
            address: "כתובת",
            city: "עיר",
            save: "שמור שינויים",
            cancel: "ביטול",
            edit: "עריכת פרטים",
            changePhoto: "שנה תמונה",
            uploadPhoto: "העלה תמונת פרופיל",
            newOrderTitle: "יצירת הזמנה חדשה",
            selectProducts: "בחרו את המוצרים והכמויות הרצויות",
            product: "מוצר",
            quantity: "כמות",
            sunflowerOil1L: "ארגז שמן חמניות 1 ליטר",
            sunflowerOil5L: "ארגז שמן חמניות 5 ליטר",
            sunflowerOil18L: "ארגז שמן חמניות 18 ליטר",
            submitOrder: "שלח בקשה להצעת מחיר",
            orderNote: "לאחר שליחת הבקשה, תקבלו הצעת מחיר מותאמת אישית בוואטסאפ",
            noOrders: "אין הזמנות עדיין",
            noInvoices: "אין חשבוניות עדיין",
            stats: {
                totalOrders: "סה״כ הזמנות",
                totalSpent: "סה״כ רכישות",
                pendingOrders: "הזמנות פתוחות",
            },
            perUnit: "ארגזים",
        },
        en: {
            welcome: "Hello",
            newOrder: "New Order",
            myOrders: "My Orders",
            invoices: "Invoices",
            profile: "My Profile",
            logout: "Logout",
            orderNumber: "Order #",
            date: "Date",
            status: "Status",
            total: "Total",
            items: "Items",
            actions: "Actions",
            view: "View",
            download: "Download PDF",
            statuses: {
                pending: "Pending",
                approved: "Approved",
                paid: "Paid",
                shipped: "Shipped",
                delivered: "Delivered",
            },
            invoiceNumber: "Invoice #",
            amount: "Amount",
            orderRef: "Order",
            profileTitle: "Company Details",
            companyNameLabel: "Company Name",
            taxId: "Tax ID",
            email: "Email",
            phone: "Phone",
            address: "Address",
            city: "City",
            save: "Save Changes",
            cancel: "Cancel",
            edit: "Edit Details",
            changePhoto: "Change Photo",
            uploadPhoto: "Upload Profile Photo",
            newOrderTitle: "Create New Order",
            selectProducts: "Select your products and quantities",
            product: "Product",
            quantity: "Quantity",
            sunflowerOil1L: "Case of Sunflower Oil 1L",
            sunflowerOil5L: "Case of Sunflower Oil 5L",
            sunflowerOil18L: "Case of Sunflower Oil 18L",
            submitOrder: "Request Quote",
            orderNote: "After submitting, you'll receive a personalized quote via WhatsApp",
            noOrders: "No orders yet",
            noInvoices: "No invoices yet",
            stats: {
                totalOrders: "Total Orders",
                totalSpent: "Total Spent",
                pendingOrders: "Open Orders",
            },
            perUnit: "cases",
        },
        ru: {
            welcome: "Привет",
            newOrder: "Новый заказ",
            myOrders: "Мои заказы",
            invoices: "Счета",
            profile: "Мой профиль",
            logout: "Выйти",
            orderNumber: "Заказ №",
            date: "Дата",
            status: "Статус",
            total: "Итого",
            items: "Товары",
            actions: "Действия",
            view: "Просмотр",
            download: "Скачать PDF",
            statuses: {
                pending: "Ожидает",
                approved: "Одобрено",
                paid: "Оплачено",
                shipped: "Отправлено",
                delivered: "Доставлено",
            },
            invoiceNumber: "Счет №",
            amount: "Сумма",
            orderRef: "Заказ",
            profileTitle: "Данные компании",
            companyNameLabel: "Название",
            taxId: "ИНН",
            email: "Email",
            phone: "Телефон",
            address: "Адрес",
            city: "Город",
            save: "Сохранить",
            cancel: "Отмена",
            edit: "Редактировать",
            changePhoto: "Изменить фото",
            uploadPhoto: "Загрузить фото",
            newOrderTitle: "Создать заказ",
            selectProducts: "Выберите товары и количество",
            product: "Товар",
            quantity: "Количество",
            sunflowerOil1L: "Ящик подсолнечного масла 1л",
            sunflowerOil5L: "Ящик подсолнечного масла 5л",
            sunflowerOil18L: "Ящик подсолнечного масла 18л",
            submitOrder: "Запросить цену",
            orderNote: "После отправки вы получите персональную цену в WhatsApp",
            noOrders: "Заказов пока нет",
            noInvoices: "Счетов пока нет",
            stats: {
                totalOrders: "Всего заказов",
                totalSpent: "Всего потрачено",
                pendingOrders: "Открытые заказы",
            },
            perUnit: "ящиков",
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.he;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-amber-50 text-amber-700 border border-amber-200";
            case "approved": return "bg-blue-50 text-blue-700 border border-blue-200";
            case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "shipped": return "bg-violet-50 text-violet-700 border border-violet-200";
            case "delivered": return "bg-gray-50 text-gray-700 border border-gray-200";
            default: return "bg-gray-50 text-gray-700 border border-gray-200";
        }
    };

    const tabs = [
        {
            id: "newOrder" as const, label: t.newOrder, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
            )
        },
        {
            id: "orders" as const, label: t.myOrders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        },
        {
            id: "invoices" as const, label: t.invoices, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            id: "profile" as const, label: t.profile, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        },
    ];

    const updateQuantity = (size: "1L" | "5L" | "18L", delta: number) => {
        setOrderQuantities(prev => ({
            ...prev,
            [size]: Math.max(0, prev[size] + delta)
        }));
    };

    const handleProfileImageUpload = () => {
        // TODO: Implement file upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setProfile(prev => ({ ...prev, profileImage: e.target?.result as string }));
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 ${isRTL ? "rtl" : "ltr"}`}>
            {/* Premium Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link href={`/${locale}`} className="flex items-center gap-3 group">
                            <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                                <Image
                                    src="/crystolia-logo.png"
                                    alt="Crystolia"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="text-2xl font-extralight tracking-tight text-gray-900">
                                Crystolia
                            </span>
                        </Link>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50 transition-all duration-300"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900">{profile.companyName}</p>
                                    <p className="text-xs text-gray-500">{t.welcome}</p>
                                </div>

                                {/* Profile Picture */}
                                <div className="relative group">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-medium text-lg shadow-lg shadow-[#F5C542]/20 overflow-hidden">
                                        {profile.profileImage ? (
                                            <Image src={profile.profileImage} alt="Profile" fill className="object-cover" />
                                        ) : (
                                            profile.companyName.charAt(0)
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>

                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                                    <button
                                        onClick={() => { handleProfileImageUpload(); setShowProfileMenu(false); }}
                                        className="w-full px-4 py-3 text-right text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {t.uploadPhoto}
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab("profile"); setShowProfileMenu(false); }}
                                        className="w-full px-4 py-3 text-right text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t.profile}
                                    </button>
                                    <div className="border-t border-gray-100 my-2" />
                                    <Link
                                        href={`/${locale}`}
                                        className="w-full px-4 py-3 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        {t.logout}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Premium Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#F5C542]/20 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-7 h-7 text-[#F5C542]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{t.stats.totalOrders}</p>
                                <p className="text-3xl font-light text-gray-900">{mockOrders.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{t.stats.totalSpent}</p>
                                <p className="text-3xl font-light text-gray-900">₪{mockOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{t.stats.pendingOrders}</p>
                                <p className="text-3xl font-light text-gray-900">1</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Tabs Container */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 px-6 py-5 text-sm font-light transition-all duration-300 flex items-center justify-center gap-3 relative ${activeTab === tab.id
                                    ? "text-[#F5C542] bg-white"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#F5C542] to-transparent" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-8">
                        {/* New Order Tab */}
                        {activeTab === "newOrder" && (
                            <div className="max-w-3xl mx-auto">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-extralight text-gray-900 mb-3">{t.newOrderTitle}</h2>
                                    <p className="text-gray-500">{t.selectProducts}</p>
                                </div>

                                <div className="space-y-4 mb-10">
                                    {[
                                        { size: "1L", name: t.sunflowerOil1L, desc: "12 בקבוקים בארגז" },
                                        { size: "5L", name: t.sunflowerOil5L, desc: "4 בקבוקים בארגז" },
                                        { size: "18L", name: t.sunflowerOil18L, desc: "פח בודד" },
                                    ].map((product) => (
                                        <div key={product.size} className="group flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#F5C542]/30 hover:shadow-lg transition-all duration-300">
                                            <div className="flex items-center gap-5">
                                                <div className="w-20 h-20 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                                                    🌻
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-lg">{product.name}</p>
                                                    <p className="text-sm text-gray-500">{product.desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateQuantity(product.size as "1L" | "5L" | "18L", -1)}
                                                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 hover:border-[#F5C542] hover:bg-[#F5C542]/5 transition-all duration-300 flex items-center justify-center text-xl font-light text-gray-600 hover:text-[#F5C542]"
                                                >
                                                    −
                                                </button>
                                                <div className="w-24 text-center">
                                                    <input
                                                        type="number"
                                                        value={orderQuantities[product.size as "1L" | "5L" | "18L"]}
                                                        onChange={(e) => setOrderQuantities(prev => ({ ...prev, [product.size]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                        min={0}
                                                        className="w-full text-center text-xl font-light px-3 py-3 rounded-xl border border-gray-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">{t.perUnit}</p>
                                                </div>
                                                <button
                                                    onClick={() => updateQuantity(product.size as "1L" | "5L" | "18L", 1)}
                                                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 hover:border-[#F5C542] hover:bg-[#F5C542]/5 transition-all duration-300 flex items-center justify-center text-xl font-light text-gray-600 hover:text-[#F5C542]"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gradient-to-r from-[#F5C542]/10 to-[#F5C542]/5 rounded-2xl p-5 mb-8 border border-[#F5C542]/20">
                                    <p className="text-sm text-gray-700 flex items-center gap-3">
                                        <span className="text-xl">💡</span>
                                        {t.orderNote}
                                    </p>
                                </div>

                                <button className="w-full px-8 py-5 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-white rounded-2xl font-light text-lg tracking-wide hover:shadow-xl hover:shadow-[#F5C542]/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                                    {t.submitOrder}
                                </button>
                            </div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <div>
                                <h2 className="text-3xl font-extralight text-gray-900 mb-8">{t.myOrders}</h2>

                                {mockOrders.length > 0 ? (
                                    <div className="space-y-4">
                                        {mockOrders.map((order) => (
                                            <div key={order.id} className="group p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#F5C542]/30 hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center">
                                                            <span className="text-2xl">📦</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">#{order.id}</p>
                                                            <p className="text-sm text-gray-500">{order.date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-left">
                                                            <p className="text-sm text-gray-500">{order.items}</p>
                                                            <p className="font-medium text-gray-900">₪{order.total.toLocaleString()}</p>
                                                        </div>
                                                        <span className={`px-4 py-2 rounded-xl text-xs font-medium ${getStatusColor(order.status)}`}>
                                                            {t.statuses[order.status as keyof typeof t.statuses]}
                                                        </span>
                                                        <button className="text-[#F5C542] hover:text-[#d4a83a] px-4 py-2 rounded-xl hover:bg-[#F5C542]/5 transition-all">
                                                            {t.view}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <span className="text-4xl">📦</span>
                                        </div>
                                        <p className="text-gray-500">{t.noOrders}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Invoices Tab */}
                        {activeTab === "invoices" && (
                            <div>
                                <h2 className="text-3xl font-extralight text-gray-900 mb-8">{t.invoices}</h2>

                                {mockInvoices.length > 0 ? (
                                    <div className="space-y-4">
                                        {mockInvoices.map((invoice) => (
                                            <div key={invoice.id} className="group p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#F5C542]/30 hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center">
                                                            <span className="text-2xl">📄</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{invoice.id}</p>
                                                            <p className="text-sm text-gray-500">{invoice.date} • {t.orderRef} #{invoice.orderId}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <p className="font-medium text-gray-900 text-lg">₪{invoice.amount.toLocaleString()}</p>
                                                        <button className="flex items-center gap-2 text-[#F5C542] hover:text-[#d4a83a] px-5 py-3 rounded-xl hover:bg-[#F5C542]/5 border border-[#F5C542]/30 transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            {t.download}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <span className="text-4xl">📄</span>
                                        </div>
                                        <p className="text-gray-500">{t.noInvoices}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Profile Tab */}
                        {activeTab === "profile" && (
                            <div className="max-w-2xl mx-auto">
                                {/* Profile Header Card */}
                                <div className="bg-gradient-to-r from-[#F5C542]/10 via-[#F5C542]/5 to-transparent rounded-3xl p-8 mb-8 border border-[#F5C542]/20">
                                    <div className="flex items-center gap-6">
                                        {/* Profile Picture with Upload */}
                                        <button
                                            onClick={handleProfileImageUpload}
                                            className="relative group"
                                        >
                                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-light text-3xl shadow-xl shadow-[#F5C542]/30 overflow-hidden">
                                                {profile.profileImage ? (
                                                    <Image src={profile.profileImage} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    profile.companyName.charAt(0)
                                                )}
                                            </div>
                                            <div className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                        </button>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-light text-gray-900 mb-1">{profile.companyName}</h3>
                                            <p className="text-gray-500">{profile.email}</p>
                                        </div>
                                        {!isEditingProfile && (
                                            <button
                                                onClick={() => setIsEditingProfile(true)}
                                                className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-light text-gray-700 hover:border-[#F5C542] hover:text-[#F5C542] hover:bg-[#F5C542]/5 transition-all duration-300 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                {t.edit}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Profile Details */}
                                <div className="bg-white rounded-3xl p-8 border border-gray-100">
                                    <h3 className="text-xl font-light text-gray-900 mb-6">{t.profileTitle}</h3>

                                    {isEditingProfile ? (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-sm font-light text-gray-500 mb-2">{t.companyNameLabel}</label>
                                                    <input
                                                        type="text"
                                                        value={profile.companyName}
                                                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-light text-gray-500 mb-2">{t.taxId}</label>
                                                    <input
                                                        type="text"
                                                        value={profile.taxId}
                                                        onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-sm font-light text-gray-500 mb-2">{t.email}</label>
                                                    <input
                                                        type="email"
                                                        value={profile.email}
                                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-light text-gray-500 mb-2">{t.phone}</label>
                                                    <input
                                                        type="tel"
                                                        value={profile.phone}
                                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-light text-gray-500 mb-2">{t.address}</label>
                                                <input
                                                    type="text"
                                                    value={profile.address}
                                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-light text-gray-500 mb-2">{t.city}</label>
                                                <input
                                                    type="text"
                                                    value={profile.city}
                                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
                                                />
                                            </div>
                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    onClick={() => setIsEditingProfile(false)}
                                                    className="flex-1 px-6 py-4 border border-gray-200 rounded-xl text-gray-600 font-light hover:bg-gray-50 transition-all duration-300"
                                                >
                                                    {t.cancel}
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingProfile(false)}
                                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-white rounded-xl font-light hover:shadow-lg hover:shadow-[#F5C542]/30 transition-all duration-300"
                                                >
                                                    {t.save}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-4 bg-gray-50 rounded-xl">
                                                    <p className="text-xs text-gray-400 mb-1">{t.companyNameLabel}</p>
                                                    <p className="text-gray-900">{profile.companyName}</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-xl">
                                                    <p className="text-xs text-gray-400 mb-1">{t.taxId}</p>
                                                    <p className="text-gray-900">{profile.taxId}</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-xl">
                                                    <p className="text-xs text-gray-400 mb-1">{t.email}</p>
                                                    <p className="text-gray-900">{profile.email}</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-xl">
                                                    <p className="text-xs text-gray-400 mb-1">{t.phone}</p>
                                                    <p className="text-gray-900">{profile.phone}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-xl">
                                                <p className="text-xs text-gray-400 mb-1">{t.address}</p>
                                                <p className="text-gray-900">{profile.address}, {profile.city}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
