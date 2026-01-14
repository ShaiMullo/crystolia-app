"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface AdminDashboardProps {
    locale: string;
}

// Mock data - will be replaced with real data from API
const mockPendingOrders = [
    {
        id: "12346",
        date: "2026-01-14",
        customer: "מסעדת הזית הירוק",
        phone: "050-1234567",
        email: "olive@restaurant.com",
        items: [
            { product: "ארגז שמן חמניות 1L", quantity: 10 },
            { product: "ארגז שמן חמניות 5L", quantity: 5 },
        ],
        calculatedCost: 1850,
        suggestedPrice: 2200,
    },
    {
        id: "12347",
        date: "2026-01-14",
        customer: "קייטרינג גולדן",
        phone: "052-9876543",
        email: "info@golden.co.il",
        items: [
            { product: "ארגז שמן חמניות 18L", quantity: 10 },
        ],
        calculatedCost: 2100,
        suggestedPrice: 2500,
    },
];

const mockRecentOrders = [
    { id: "12345", date: "2026-01-13", customer: "מלון רויאל", status: "paid", total: 3500 },
    { id: "12344", date: "2026-01-12", customer: "בית קפה אספרסו", status: "shipped", total: 1200 },
    { id: "12343", date: "2026-01-11", customer: "מסעדת ים תיכון", status: "delivered", total: 4200 },
];

const mockCustomers = [
    { id: 1, name: "מסעדת הזית הירוק", email: "olive@restaurant.com", phone: "050-1234567", totalOrders: 15, totalSpent: 45000 },
    { id: 2, name: "קייטרינג גולדן", email: "info@golden.co.il", phone: "052-9876543", totalOrders: 8, totalSpent: 28000 },
    { id: 3, name: "מלון רויאל", email: "purchasing@royal.co.il", phone: "03-5551234", totalOrders: 22, totalSpent: 78000 },
];

export default function AdminDashboard({ locale }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<"pending" | "orders" | "customers" | "settings">("pending");
    const [selectedOrder, setSelectedOrder] = useState<typeof mockPendingOrders[0] | null>(null);
    const [customPrice, setCustomPrice] = useState("");
    const [showPriceModal, setShowPriceModal] = useState(false);
    const isRTL = locale === "he";

    // Settings state
    const [settings, setSettings] = useState({
        price1L: 18,
        price5L: 75,
        price18L: 240,
        minOrderEnabled: false,
        minOrderUnits: 5,
        creditEnabled: true,
        bankTransferEnabled: true,
        cashEnabled: true,
    });

    const translations = {
        he: {
            adminTitle: "ניהול Crystolia",
            welcome: "שלום, מנהל",
            pendingOrders: "הזמנות ממתינות",
            allOrders: "כל ההזמנות",
            customers: "לקוחות",
            settings: "הגדרות",
            greenInvoice: "חשבונית ירוקה",
            logout: "יציאה",
            orderNumber: "הזמנה",
            date: "תאריך",
            customer: "לקוח",
            items: "פריטים",
            calculatedCost: "עלות מחושבת",
            setPrice: "קבע מחיר",
            approve: "אשר",
            reject: "דחה",
            status: "סטטוס",
            total: "סה״כ",
            actions: "פעולות",
            view: "צפה",
            statuses: {
                pending: "ממתין",
                approved: "אושר",
                paid: "שולם",
                shipped: "נשלח",
                delivered: "נמסר",
            },
            stats: {
                pendingOrders: "ממתינות לאישור",
                todayOrders: "הזמנות היום",
                monthlyRevenue: "הכנסות החודש",
                activeCustomers: "לקוחות פעילים",
            },
            priceModal: {
                title: "קביעת מחיר להזמנה",
                calculatedCost: "עלות מחושבת",
                suggestedPrice: "מחיר מומלץ",
                customPrice: "מחיר מותאם",
                placeholder: "הזן מחיר",
                approveWithPrice: "אשר במחיר זה",
                cancel: "ביטול",
            },
            customerDetails: {
                name: "שם הלקוח",
                email: "אימייל",
                phone: "טלפון",
                totalOrders: "סה״כ הזמנות",
                totalSpent: "סה״כ רכישות",
            },
            settingsPage: {
                title: "הגדרות מערכת",
                pricing: "מחירון בסיס (עלויות לארגז)",
                product1L: "ארגז שמן חמניות 1 ליטר",
                product5L: "ארגז שמן חמניות 5 ליטר",
                product18L: "ארגז שמן חמניות 18 ליטר",
                minOrder: "מינימום הזמנה (ארגזים)",
                enabled: "פעיל",
                disabled: "כבוי",
                units: "ארגזים",
                paymentMethods: "אמצעי תשלום",
                credit: "כרטיס אשראי",
                bankTransfer: "העברה בנקאית",
                cash: "מזומן",
                save: "שמור הגדרות",
            },
            noPendingOrders: "אין הזמנות ממתינות",
            orderApproved: "ההזמנה אושרה!",
            orderRejected: "ההזמנה נדחתה",
        },
        en: {
            adminTitle: "Crystolia Admin",
            welcome: "Hello, Admin",
            pendingOrders: "Pending Orders",
            allOrders: "All Orders",
            customers: "Customers",
            settings: "Settings",
            greenInvoice: "Green Invoice",
            logout: "Logout",
            orderNumber: "Order",
            date: "Date",
            customer: "Customer",
            items: "Items",
            calculatedCost: "Calculated Cost",
            setPrice: "Set Price",
            approve: "Approve",
            reject: "Reject",
            status: "Status",
            total: "Total",
            actions: "Actions",
            view: "View",
            statuses: {
                pending: "Pending",
                approved: "Approved",
                paid: "Paid",
                shipped: "Shipped",
                delivered: "Delivered",
            },
            stats: {
                pendingOrders: "Pending Approval",
                todayOrders: "Today's Orders",
                monthlyRevenue: "Monthly Revenue",
                activeCustomers: "Active Customers",
            },
            priceModal: {
                title: "Set Order Price",
                calculatedCost: "Calculated Cost",
                suggestedPrice: "Suggested Price",
                customPrice: "Custom Price",
                placeholder: "Enter price",
                approveWithPrice: "Approve with this price",
                cancel: "Cancel",
            },
            customerDetails: {
                name: "Customer Name",
                email: "Email",
                phone: "Phone",
                totalOrders: "Total Orders",
                totalSpent: "Total Spent",
            },
            settingsPage: {
                title: "System Settings",
                pricing: "Base Pricing (Cost per Case)",
                product1L: "Case of Sunflower Oil 1L",
                product5L: "Case of Sunflower Oil 5L",
                product18L: "Case of Sunflower Oil 18L",
                minOrder: "Minimum Order (Cases)",
                enabled: "Enabled",
                disabled: "Disabled",
                units: "cases",
                paymentMethods: "Payment Methods",
                credit: "Credit Card",
                bankTransfer: "Bank Transfer",
                cash: "Cash",
                save: "Save Settings",
            },
            noPendingOrders: "No pending orders",
            orderApproved: "Order approved!",
            orderRejected: "Order rejected",
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

    const handleApproveOrder = (order: typeof mockPendingOrders[0]) => {
        setSelectedOrder(order);
        setCustomPrice(order.suggestedPrice.toString());
        setShowPriceModal(true);
    };

    const confirmApproval = () => {
        // TODO: Send to backend & WhatsApp
        console.log(`Order ${selectedOrder?.id} approved with price: ${customPrice}`);
        setShowPriceModal(false);
        setSelectedOrder(null);
        alert(t.orderApproved);
    };

    const handleRejectOrder = (orderId: string) => {
        // TODO: Send to backend & WhatsApp
        console.log(`Order ${orderId} rejected`);
        alert(t.orderRejected);
    };

    const tabs = [
        {
            id: "pending" as const, label: t.pendingOrders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ), badge: mockPendingOrders.length
        },
        {
            id: "orders" as const, label: t.allOrders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            )
        },
        {
            id: "customers" as const, label: t.customers, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            id: "settings" as const, label: t.settings, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
    ];

    return (
        <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${isRTL ? "rtl" : "ltr"}`}>
            {/* Sidebar */}
            <aside className="fixed top-0 right-0 h-full w-72 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700/50 z-40">
                <div className="p-6">
                    {/* Logo */}
                    <Link href={`/${locale}`} className="flex items-center gap-3 mb-10 group">
                        <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                            <Image
                                src="/crystolia-logo.png"
                                alt="Crystolia"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="text-xl font-light tracking-tight text-white">
                            {t.adminTitle}
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id
                                    ? "bg-[#F5C542] text-slate-900"
                                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                    }`}
                            >
                                {tab.icon}
                                <span className="font-light">{tab.label}</span>
                                {tab.badge && (
                                    <span className={`mr-auto px-2 py-0.5 rounded-full text-xs font-medium ${activeTab === tab.id ? "bg-slate-900 text-[#F5C542]" : "bg-red-500 text-white"
                                        }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Green Invoice Link */}
                    <div className="mt-8 pt-8 border-t border-slate-700/50">
                        <a
                            href="https://app.greeninvoice.co.il"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-light">{t.greenInvoice}</span>
                            <svg className="w-4 h-4 mr-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* User & Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-slate-900 font-medium">
                            מ
                        </div>
                        <div>
                            <p className="text-sm text-white font-medium">{t.welcome}</p>
                        </div>
                    </div>
                    <Link
                        href={`/${locale}`}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t.logout}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="mr-72 min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 px-8 py-6">
                    <h1 className="text-2xl font-extralight text-white">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
                </header>

                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border border-red-500/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t.stats.pendingOrders}</p>
                                    <p className="text-3xl font-light text-white">{mockPendingOrders.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t.stats.todayOrders}</p>
                                    <p className="text-3xl font-light text-white">5</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t.stats.monthlyRevenue}</p>
                                    <p className="text-3xl font-light text-white">₪45K</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl p-6 border border-[#F5C542]/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#F5C542]/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#F5C542]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t.stats.activeCustomers}</p>
                                    <p className="text-3xl font-light text-white">{mockCustomers.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Orders Tab */}
                    {activeTab === "pending" && (
                        <div className="space-y-4">
                            {mockPendingOrders.length > 0 ? (
                                mockPendingOrders.map((order) => (
                                    <div key={order.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-[#F5C542]/30 transition-all duration-300">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-lg font-medium text-white">#{order.id}</span>
                                                    <span className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                        {t.statuses.pending}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400">{order.date}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white font-medium">{order.customer}</p>
                                                <p className="text-sm text-slate-400">{order.phone}</p>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                                            <p className="text-sm text-slate-400 mb-2">{t.items}:</p>
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => (
                                                    <p key={idx} className="text-white">
                                                        {item.product} × {item.quantity}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-center justify-between mb-4 p-4 bg-slate-900/50 rounded-xl">
                                            <div>
                                                <p className="text-sm text-slate-400">{t.calculatedCost}</p>
                                                <p className="text-xl font-light text-white">₪{order.calculatedCost.toLocaleString()}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm text-slate-400">{t.priceModal.suggestedPrice}</p>
                                                <p className="text-xl font-light text-[#F5C542]">₪{order.suggestedPrice.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApproveOrder(order)}
                                                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-slate-900 rounded-xl font-medium hover:shadow-lg hover:shadow-[#F5C542]/30 transition-all duration-300"
                                            >
                                                {t.setPrice} & {t.approve}
                                            </button>
                                            <button
                                                onClick={() => handleRejectOrder(order.id)}
                                                className="px-6 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-light hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
                                            >
                                                {t.reject}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">✅</span>
                                    </div>
                                    <p className="text-slate-400">{t.noPendingOrders}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* All Orders Tab */}
                    {activeTab === "orders" && (
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.orderNumber}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.date}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.customer}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.total}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.status}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{t.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mockRecentOrders.map((order) => (
                                            <tr key={order.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                                <td className="py-4 px-6 text-white">#{order.id}</td>
                                                <td className="py-4 px-6 text-slate-400">{order.date}</td>
                                                <td className="py-4 px-6 text-white">{order.customer}</td>
                                                <td className="py-4 px-6 text-white font-medium">₪{order.total.toLocaleString()}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                        {t.statuses[order.status as keyof typeof t.statuses]}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <button className="text-[#F5C542] hover:text-[#d4a83a] text-sm transition-colors">
                                                        {t.view}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Customers Tab */}
                    {activeTab === "customers" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {mockCustomers.map((customer) => (
                                <div key={customer.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-[#F5C542]/30 transition-all duration-300">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-slate-900 font-medium text-xl">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{customer.name}</p>
                                            <p className="text-sm text-slate-400">{customer.email}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{t.customerDetails.phone}</span>
                                            <span className="text-white">{customer.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{t.customerDetails.totalOrders}</span>
                                            <span className="text-white">{customer.totalOrders}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{t.customerDetails.totalSpent}</span>
                                            <span className="text-[#F5C542] font-medium">₪{customer.totalSpent.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === "settings" && (
                        <div className="max-w-2xl space-y-8">
                            {/* Pricing Settings */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h3 className="text-lg text-white mb-6 flex items-center gap-2">
                                    <span>💰</span> {t.settingsPage.pricing}
                                </h3>
                                <div className="space-y-4">
                                    {[
                                        { key: "price1L", label: t.settingsPage.product1L },
                                        { key: "price5L", label: t.settingsPage.product5L },
                                        { key: "price18L", label: t.settingsPage.product18L },
                                    ].map((product) => (
                                        <div key={product.key} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                            <span className="text-slate-300">{product.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">₪</span>
                                                <input
                                                    type="number"
                                                    value={settings[product.key as keyof typeof settings] as number}
                                                    onChange={(e) => setSettings({ ...settings, [product.key]: parseInt(e.target.value) || 0 })}
                                                    className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-left focus:border-[#F5C542] outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Minimum Order */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h3 className="text-lg text-white mb-6 flex items-center gap-2">
                                    <span>📦</span> {t.settingsPage.minOrder}
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setSettings({ ...settings, minOrderEnabled: !settings.minOrderEnabled })}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${settings.minOrderEnabled ? "bg-[#F5C542]" : "bg-slate-600"
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.minOrderEnabled ? "right-1" : "left-1"
                                                }`} />
                                        </button>
                                        <span className="text-slate-300">
                                            {settings.minOrderEnabled ? t.settingsPage.enabled : t.settingsPage.disabled}
                                        </span>
                                    </div>
                                    {settings.minOrderEnabled && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={settings.minOrderUnits}
                                                onChange={(e) => setSettings({ ...settings, minOrderUnits: parseInt(e.target.value) || 0 })}
                                                className="w-20 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-center focus:border-[#F5C542] outline-none"
                                            />
                                            <span className="text-slate-400">{t.settingsPage.units}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h3 className="text-lg text-white mb-6 flex items-center gap-2">
                                    <span>💳</span> {t.settingsPage.paymentMethods}
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { key: "creditEnabled", label: t.settingsPage.credit, icon: "💳" },
                                        { key: "bankTransferEnabled", label: t.settingsPage.bankTransfer, icon: "🏦" },
                                        { key: "cashEnabled", label: t.settingsPage.cash, icon: "💵" },
                                    ].map((method) => (
                                        <div key={method.key} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                            <span className="text-slate-300 flex items-center gap-2">
                                                <span>{method.icon}</span> {method.label}
                                            </span>
                                            <button
                                                onClick={() => setSettings({ ...settings, [method.key]: !settings[method.key as keyof typeof settings] })}
                                                className={`relative w-14 h-8 rounded-full transition-colors ${settings[method.key as keyof typeof settings] ? "bg-[#F5C542]" : "bg-slate-600"
                                                    }`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings[method.key as keyof typeof settings] ? "right-1" : "left-1"
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Save Button */}
                            <button className="w-full px-8 py-4 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-slate-900 rounded-xl font-medium hover:shadow-lg hover:shadow-[#F5C542]/30 transition-all duration-300">
                                {t.settingsPage.save}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Price Modal */}
            {showPriceModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-700">
                        <h3 className="text-xl text-white mb-6">{t.priceModal.title}</h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between p-4 bg-slate-900/50 rounded-xl">
                                <span className="text-slate-400">{t.priceModal.calculatedCost}</span>
                                <span className="text-white">₪{selectedOrder.calculatedCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-4 bg-slate-900/50 rounded-xl">
                                <span className="text-slate-400">{t.priceModal.suggestedPrice}</span>
                                <span className="text-[#F5C542]">₪{selectedOrder.suggestedPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm text-slate-400 mb-2">{t.priceModal.customPrice}</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">₪</span>
                                <input
                                    type="number"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    placeholder={t.priceModal.placeholder}
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-left focus:border-[#F5C542] outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPriceModal(false)}
                                className="flex-1 px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-light hover:bg-slate-600 transition-all"
                            >
                                {t.priceModal.cancel}
                            </button>
                            <button
                                onClick={confirmApproval}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-slate-900 rounded-xl font-medium hover:shadow-lg hover:shadow-[#F5C542]/30 transition-all"
                            >
                                {t.priceModal.approveWithPrice}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
