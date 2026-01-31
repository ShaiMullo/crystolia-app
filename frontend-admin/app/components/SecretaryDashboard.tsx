"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface SecretaryDashboardProps {
    locale: string;
}

// Mock data
const mockCustomers = [
    {
        id: 1,
        name: "מסעדת הזית הירוק",
        email: "olive@restaurant.com",
        phone: "050-1234567",
        address: "רחוב הזיתים 15, תל אביב",
        taxId: "515123456",
        totalOrders: 15,
        totalSpent: 45000,
        lastOrder: "2026-01-14",
        notes: "לקוח ותיק, מעדיף משלוחים בבוקר",
        orderBreakdown: {
            cases1L: 85,
            cases5L: 42,
            cases18L: 15,
        },
        monthlyData: [
            { month: "ינואר", amount: 8500 },
            { month: "דצמבר", amount: 7200 },
            { month: "נובמבר", amount: 9100 },
        ]
    },
    {
        id: 2,
        name: "קייטרינג גולדן",
        email: "info@golden.co.il",
        phone: "052-9876543",
        address: "אזור התעשייה הרצליה",
        taxId: "512987654",
        totalOrders: 8,
        totalSpent: 28000,
        lastOrder: "2026-01-12",
        notes: "",
        orderBreakdown: {
            cases1L: 20,
            cases5L: 35,
            cases18L: 28,
        },
        monthlyData: [
            { month: "ינואר", amount: 4200 },
            { month: "דצמבר", amount: 5500 },
            { month: "נובמבר", amount: 3800 },
        ]
    },
    {
        id: 3,
        name: "מלון רויאל",
        email: "purchasing@royal.co.il",
        phone: "03-5551234",
        address: "שדרות הים 100, תל אביב",
        taxId: "513456789",
        totalOrders: 22,
        totalSpent: 78000,
        lastOrder: "2026-01-13",
        notes: "יש להתקשר לפני משלוח",
        orderBreakdown: {
            cases1L: 120,
            cases5L: 80,
            cases18L: 45,
        },
        monthlyData: [
            { month: "ינואר", amount: 12500 },
            { month: "דצמבר", amount: 15200 },
            { month: "נובמבר", amount: 11800 },
        ]
    },
    {
        id: 4,
        name: "בית קפה אספרסו",
        email: "order@espresso.co.il",
        phone: "054-1112222",
        address: "דיזנגוף 50, תל אביב",
        taxId: "514567890",
        totalOrders: 5,
        totalSpent: 12000,
        lastOrder: "2026-01-10",
        notes: "",
        orderBreakdown: {
            cases1L: 45,
            cases5L: 12,
            cases18L: 3,
        },
        monthlyData: [
            { month: "ינואר", amount: 2800 },
            { month: "דצמבר", amount: 3200 },
            { month: "נובמבר", amount: 2500 },
        ]
    },
];

const mockRecentOrders = [
    { id: "12345", date: "2026-01-14", customerId: 1, customer: "מסעדת הזית הירוק", status: "paid", total: 3500, items: "ארגז 1L x 10, ארגז 5L x 5" },
    { id: "12344", date: "2026-01-13", customerId: 3, customer: "מלון רויאל", status: "shipped", total: 1200, items: "ארגז 5L x 8" },
    { id: "12343", date: "2026-01-12", customerId: 2, customer: "קייטרינג גולדן", status: "delivered", total: 4200, items: "ארגז 18L x 15" },
    { id: "12342", date: "2026-01-10", customerId: 4, customer: "בית קפה אספרסו", status: "delivered", total: 2800, items: "ארגז 1L x 20" },
];


export default function SecretaryDashboard({ locale }: SecretaryDashboardProps) {
    const [activeTab, setActiveTab] = useState<"customers" | "orders" | "analytics">("customers");
    const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomers[0] | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editForm, setEditForm] = useState<typeof mockCustomers[0] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [timePeriod, setTimePeriod] = useState<"month" | "quarter" | "year">("month");
    const [chartType, setChartType] = useState<"bar" | "pie">("bar");
    const isRTL = locale === "he";

    const translations = {
        he: {
            secretaryTitle: "ניהול לקוחות",
            welcome: "שלום, מזכירה",
            customers: "לקוחות",
            orders: "היסטוריית הזמנות",
            greenInvoice: "חשבונית ירוקה",
            logout: "יציאה",
            search: "חיפוש לקוח...",
            customerDetails: {
                name: "שם הלקוח",
                email: "אימייל",
                phone: "טלפון",
                address: "כתובת",
                taxId: "ח.פ / ע.מ",
                totalOrders: "סה״כ הזמנות",
                totalSpent: "סה״כ רכישות",
                lastOrder: "הזמנה אחרונה",
                notes: "הערות",
            },
            actions: {
                edit: "עריכה",
                save: "שמור",
                cancel: "ביטול",
                view: "צפה",
                call: "התקשר",
                email: "שלח מייל",
            },
            stats: {
                totalCustomers: "סה״כ לקוחות",
                ordersThisMonth: "הזמנות החודש",
                totalRevenue: "הכנסות כוללות",
            },
            orderNumber: "מספר הזמנה",
            date: "תאריך",
            customer: "לקוח",
            items: "פריטים",
            total: "סה״כ",
            status: "סטטוס",
            statuses: {
                pending: "ממתין",
                approved: "אושר",
                paid: "שולם",
                shipped: "נשלח",
                delivered: "נמסר",
            },
            noResults: "לא נמצאו תוצאות",
            editCustomer: "עריכת פרטי לקוח",
            analytics: "אנליטיקה",
            topCustomers: "Top לקוחות",
            timePeriods: {
                month: "חודש",
                quarter: "רבעון",
                year: "שנה",
            },
            orderBreakdown: "פירוט הזמנות",
            cases1L: "ארגזי 1 ליטר",
            cases5L: "ארגזי 5 ליטר",
            cases18L: "ארגזי 18 ליטר",
            viewDetails: "צפה בפרטים",
            customerBreakdown: "פירוט לקוח",
            close: "סגור",
            chartTypes: {
                bar: "עמודות",
                pie: "עוגה",
            },
        },
        en: {
            secretaryTitle: "Customer Management",
            welcome: "Hello, Secretary",
            customers: "Customers",
            orders: "Order History",
            greenInvoice: "Green Invoice",
            logout: "Logout",
            search: "Search customer...",
            customerDetails: {
                name: "Customer Name",
                email: "Email",
                phone: "Phone",
                address: "Address",
                taxId: "Tax ID",
                totalOrders: "Total Orders",
                totalSpent: "Total Spent",
                lastOrder: "Last Order",
                notes: "Notes",
            },
            actions: {
                edit: "Edit",
                save: "Save",
                cancel: "Cancel",
                view: "View",
                call: "Call",
                email: "Send Email",
            },
            stats: {
                totalCustomers: "Total Customers",
                ordersThisMonth: "Orders This Month",
                totalRevenue: "Total Revenue",
            },
            orderNumber: "Order #",
            date: "Date",
            customer: "Customer",
            items: "Items",
            total: "Total",
            status: "Status",
            statuses: {
                pending: "Pending",
                approved: "Approved",
                paid: "Paid",
                shipped: "Shipped",
                delivered: "Delivered",
            },
            noResults: "No results found",
            editCustomer: "Edit Customer Details",
            analytics: "Analytics",
            topCustomers: "Top Customers",
            timePeriods: {
                month: "Month",
                quarter: "Quarter",
                year: "Year",
            },
            orderBreakdown: "Order Breakdown",
            cases1L: "Cases 1L",
            cases5L: "Cases 5L",
            cases18L: "Cases 18L",
            viewDetails: "View Details",
            customerBreakdown: "Customer Breakdown",
            close: "Close",
            chartTypes: {
                bar: "Bar",
                pie: "Pie",
            },
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

    const filteredCustomers = mockCustomers.filter(c =>
        c.name.includes(searchQuery) ||
        c.email.includes(searchQuery) ||
        c.phone.includes(searchQuery)
    );

    const handleEditCustomer = (customer: typeof mockCustomers[0]) => {
        setEditForm({ ...customer });
        setShowEditModal(true);
    };

    const handleSaveCustomer = () => {
        // TODO: Save to backend
        console.log("Saving customer:", editForm);
        setShowEditModal(false);
        setEditForm(null);
    };

    const tabs = [
        {
            id: "customers" as const, label: t.customers, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        {
            id: "orders" as const, label: t.orders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            )
        },
        {
            id: "analytics" as const, label: t.analytics, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
    ];

    return (
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 ${isRTL ? "rtl" : "ltr"}`}>
            {/* Sidebar */}
            <aside className="fixed top-0 right-0 h-full w-72 bg-white border-l border-slate-200 shadow-xl z-40">
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
                        <span className="text-xl font-light tracking-tight text-slate-900">
                            {t.secretaryTitle}
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id
                                    ? "bg-[#F5C542] text-slate-900 shadow-md shadow-[#F5C542]/20"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    }`}
                            >
                                {tab.icon}
                                <span className="font-light">{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Green Invoice Link */}
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <a
                            href="https://app.greeninvoice.co.il"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all duration-300"
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
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            מ
                        </div>
                        <div>
                            <p className="text-sm text-slate-900 font-medium">{t.welcome}</p>
                        </div>
                    </div>
                    <Link
                        href={`/${locale}`}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 transition-colors"
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
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-extralight text-slate-900">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h1>

                        {/* Search Bar */}
                        {activeTab === "customers" && (
                            <div className="relative w-80">
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t.search}
                                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all font-light"
                                />
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">{t.stats.totalCustomers}</p>
                                    <p className="text-3xl font-light text-slate-900">{mockCustomers.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">{t.stats.ordersThisMonth}</p>
                                    <p className="text-3xl font-light text-slate-900">{mockRecentOrders.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">{t.stats.totalRevenue}</p>
                                    <p className="text-3xl font-light text-slate-900">₪{mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customers Tab */}
                    {activeTab === "customers" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#F5C542]/30 transition-all duration-300"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-medium text-xl shadow-lg shadow-[#F5C542]/20">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-slate-900">{customer.name}</p>
                                                    <p className="text-sm text-slate-500">{customer.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleEditCustomer(customer)}
                                                className="px-4 py-2 text-sm text-[#F5C542] hover:bg-[#F5C542]/10 rounded-lg transition-colors"
                                            >
                                                {t.actions.edit}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.phone}</p>
                                                <p className="text-slate-900 font-medium">{customer.phone}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.taxId}</p>
                                                <p className="text-slate-900 font-medium">{customer.taxId}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.totalOrders}</p>
                                                <p className="text-slate-900 font-medium">{customer.totalOrders}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.totalSpent}</p>
                                                <p className="text-[#F5C542] font-medium">₪{customer.totalSpent.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-slate-50 rounded-xl mb-4">
                                            <p className="text-xs text-slate-400 mb-1">{t.customerDetails.address}</p>
                                            <p className="text-slate-900">{customer.address}</p>
                                        </div>

                                        {customer.notes && (
                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <p className="text-xs text-amber-600 mb-1">{t.customerDetails.notes}</p>
                                                <p className="text-amber-800 text-sm">{customer.notes}</p>
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                            <a
                                                href={`tel:${customer.phone}`}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                {t.actions.call}
                                            </a>
                                            <a
                                                href={`mailto:${customer.email}`}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                {t.actions.email}
                                            </a>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-16">
                                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">🔍</span>
                                    </div>
                                    <p className="text-slate-500">{t.noResults}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === "orders" && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.orderNumber}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.date}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.customer}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.items}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.total}</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-500">{t.status}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mockRecentOrders.map((order) => (
                                            <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6 text-slate-900 font-medium">#{order.id}</td>
                                                <td className="py-4 px-6 text-slate-500">{order.date}</td>
                                                <td className="py-4 px-6 text-slate-900">{order.customer}</td>
                                                <td className="py-4 px-6 text-slate-500 text-sm">{order.items}</td>
                                                <td className="py-4 px-6 text-slate-900 font-medium">₪{order.total.toLocaleString()}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                        {t.statuses[order.status as keyof typeof t.statuses]}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === "analytics" && (
                        <div className="space-y-8">
                            {/* Time Period & Chart Type Selector */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-light text-slate-900">{t.topCustomers}</h2>
                                    <div className="flex gap-4">
                                        {/* Chart Type Toggle */}
                                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                                            {(["bar", "pie"] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setChartType(type)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-light transition-all flex items-center gap-2 ${chartType === type
                                                            ? "bg-white text-slate-900 shadow-sm"
                                                            : "text-slate-500 hover:text-slate-700"
                                                        }`}
                                                >
                                                    {type === "bar" ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                                        </svg>
                                                    )}
                                                    {t.chartTypes[type]}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Time Period Toggle */}
                                        <div className="flex gap-2">
                                            {(["month", "quarter", "year"] as const).map((period) => (
                                                <button
                                                    key={period}
                                                    onClick={() => setTimePeriod(period)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-light transition-all ${timePeriod === period
                                                        ? "bg-[#F5C542] text-slate-900 shadow-md"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {t.timePeriods[period]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Bar Chart */}
                                {chartType === "bar" && (
                                    <div className="space-y-4">
                                        {mockCustomers
                                            .sort((a, b) => b.totalSpent - a.totalSpent)
                                            .map((customer, index) => {
                                                const maxSpent = Math.max(...mockCustomers.map(c => c.totalSpent));
                                                const percentage = (customer.totalSpent / maxSpent) * 100;

                                                return (
                                                    <div key={customer.id} className="group">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 rounded-lg bg-[#F5C542]/20 text-[#F5C542] text-xs font-medium flex items-center justify-center">
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-slate-900 font-medium">{customer.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[#F5C542] font-medium">₪{customer.totalSpent.toLocaleString()}</span>
                                                                <button
                                                                    onClick={() => { setSelectedCustomer(customer); setShowDetailsModal(true); }}
                                                                    className="text-sm text-slate-400 hover:text-[#F5C542] transition-colors"
                                                                >
                                                                    {t.viewDetails}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="h-8 bg-slate-100 rounded-xl overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#F5C542] to-[#d4a83a] rounded-xl transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#F5C542]/30"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Pie Chart */}
                                {chartType === "pie" && (
                                    <div className="flex items-center justify-center gap-12">
                                        {/* SVG Donut Chart */}
                                        <div className="relative">
                                            <svg viewBox="0 0 100 100" className="w-64 h-64 transform -rotate-90">
                                                {(() => {
                                                    const total = mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
                                                    const colors = ["#F5C542", "#10b981", "#3b82f6", "#8b5cf6"];
                                                    let cumulativePercent = 0;

                                                    return mockCustomers
                                                        .sort((a, b) => b.totalSpent - a.totalSpent)
                                                        .map((customer, index) => {
                                                            const percent = (customer.totalSpent / total) * 100;
                                                            const dashArray = `${percent} ${100 - percent}`;
                                                            const dashOffset = -cumulativePercent;
                                                            cumulativePercent += percent;

                                                            return (
                                                                <circle
                                                                    key={customer.id}
                                                                    cx="50"
                                                                    cy="50"
                                                                    r="40"
                                                                    fill="none"
                                                                    stroke={colors[index % colors.length]}
                                                                    strokeWidth="20"
                                                                    strokeDasharray={dashArray}
                                                                    strokeDashoffset={dashOffset}
                                                                    className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                                    style={{
                                                                        strokeDasharray: `${percent} ${100 - percent}`,
                                                                        strokeDashoffset: dashOffset,
                                                                    }}
                                                                    onClick={() => { setSelectedCustomer(customer); setShowDetailsModal(true); }}
                                                                />
                                                            );
                                                        });
                                                })()}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <p className="text-3xl font-light text-slate-900">₪{mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}</p>
                                                    <p className="text-sm text-slate-500">{t.stats.totalRevenue}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="space-y-3">
                                            {(() => {
                                                const total = mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
                                                const colors = ["#F5C542", "#10b981", "#3b82f6", "#8b5cf6"];

                                                return mockCustomers
                                                    .sort((a, b) => b.totalSpent - a.totalSpent)
                                                    .map((customer, index) => {
                                                        const percent = ((customer.totalSpent / total) * 100).toFixed(1);
                                                        return (
                                                            <button
                                                                key={customer.id}
                                                                onClick={() => { setSelectedCustomer(customer); setShowDetailsModal(true); }}
                                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all w-full text-right"
                                                            >
                                                                <div
                                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: colors[index % colors.length] }}
                                                                />
                                                                <div className="flex-1">
                                                                    <p className="text-slate-900 font-medium">{customer.name}</p>
                                                                    <p className="text-sm text-slate-500">₪{customer.totalSpent.toLocaleString()} ({percent}%)</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    });
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Order Breakdown Summary */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                                <h2 className="text-xl font-light text-slate-900 mb-6">{t.orderBreakdown}</h2>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100">
                                        <div className="text-3xl mb-2">📦</div>
                                        <p className="text-sm text-slate-500 mb-1">{t.cases1L}</p>
                                        <p className="text-3xl font-light text-slate-900">
                                            {mockCustomers.reduce((sum, c) => sum + c.orderBreakdown.cases1L, 0)}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100">
                                        <div className="text-3xl mb-2">🛢️</div>
                                        <p className="text-sm text-slate-500 mb-1">{t.cases5L}</p>
                                        <p className="text-3xl font-light text-slate-900">
                                            {mockCustomers.reduce((sum, c) => sum + c.orderBreakdown.cases5L, 0)}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-100">
                                        <div className="text-3xl mb-2">🪣</div>
                                        <p className="text-sm text-slate-500 mb-1">{t.cases18L}</p>
                                        <p className="text-3xl font-light text-slate-900">
                                            {mockCustomers.reduce((sum, c) => sum + c.orderBreakdown.cases18L, 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Customer Details Modal */}
            {showDetailsModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-medium text-slate-900">{t.customerBreakdown}</h3>
                            <button
                                onClick={() => { setShowDetailsModal(false); setSelectedCustomer(null); }}
                                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Customer Header */}
                        <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-[#F5C542]/10 to-transparent rounded-2xl">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-medium text-2xl">
                                {selectedCustomer.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xl font-medium text-slate-900">{selectedCustomer.name}</p>
                                <p className="text-slate-500">{selectedCustomer.email}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.totalOrders}</p>
                                <p className="text-2xl font-light text-slate-900">{selectedCustomer.totalOrders}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">{t.customerDetails.totalSpent}</p>
                                <p className="text-2xl font-light text-[#F5C542]">₪{selectedCustomer.totalSpent.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Order Breakdown */}
                        <h4 className="text-sm font-medium text-slate-500 mb-3">{t.orderBreakdown}</h4>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                <p className="text-2xl font-light text-slate-900">{selectedCustomer.orderBreakdown.cases1L}</p>
                                <p className="text-xs text-slate-500">{t.cases1L}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                                <p className="text-2xl font-light text-slate-900">{selectedCustomer.orderBreakdown.cases5L}</p>
                                <p className="text-xs text-slate-500">{t.cases5L}</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-100">
                                <p className="text-2xl font-light text-slate-900">{selectedCustomer.orderBreakdown.cases18L}</p>
                                <p className="text-xs text-slate-500">{t.cases18L}</p>
                            </div>
                        </div>

                        {/* Last Orders */}
                        <h4 className="text-sm font-medium text-slate-500 mb-3">{t.orders}</h4>
                        <div className="space-y-2">
                            {mockRecentOrders
                                .filter(o => o.customerId === selectedCustomer.id)
                                .map(order => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">#{order.id}</p>
                                            <p className="text-xs text-slate-500">{order.date} • {order.items}</p>
                                        </div>
                                        <p className="font-medium text-slate-900">₪{order.total.toLocaleString()}</p>
                                    </div>
                                ))}
                        </div>

                        <button
                            onClick={() => { setShowDetailsModal(false); setSelectedCustomer(null); }}
                            className="w-full mt-6 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-light hover:bg-slate-200 transition-all"
                        >
                            {t.close}
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Customer Modal */}
            {showEditModal && editForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                        <h3 className="text-xl font-medium text-slate-900 mb-6">{t.editCustomer}</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.name}</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.email}</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.phone}</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.address}</label>
                                <input
                                    type="text"
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.taxId}</label>
                                <input
                                    type="text"
                                    value={editForm.taxId}
                                    onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-2">{t.customerDetails.notes}</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowEditModal(false); setEditForm(null); }}
                                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-light hover:bg-slate-200 transition-all"
                            >
                                {t.actions.cancel}
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#F5C542]/30 transition-all"
                            >
                                {t.actions.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
