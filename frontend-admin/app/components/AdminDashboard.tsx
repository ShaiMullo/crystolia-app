"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "@/app/lib/api";

interface OrderItem {
    productType: '1L' | '5L' | '18L';
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
}

interface Order {
    _id: string;
    customer: {
        _id: string;
        businessName: string;
        contactPerson: string;
        phone: string;
    };
    status: 'pending_offer' | 'sent_offer' | 'pending_payment' | 'paid' | 'cancelled';
    items: OrderItem[];
    totalAmount?: number;
    approvedPrice?: number;
    customerNotes?: string;
    adminNotes?: string;
    createdAt: string;
}

interface Product {
    _id: string;
    name: string;
    litersPerBox: number;
    defaultPrice: number;
    stock: number;
    isActive: boolean;
}

interface Lead {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    company?: string;
    message?: string;
    status: 'New' | 'Handled' | 'Not Relevant';
    notes?: string;
    createdAt: string;
}

interface Customer {
    _id: string;
    businessName: string;
    contactPerson: string;
    phone: string;
    address?: {
        street: string;
        city: string;
        zip?: string;
    };
    pricingTier: string;
    user?: { email: string };
}

interface AdminDashboardProps {
    locale: string;
}

export default function AdminDashboard({ locale }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<"leads" | "pending" | "orders" | "customers" | "inventory" | "analytics" | "settings">("pending");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [itemPrices, setItemPrices] = useState<number[]>([]);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [chartType, setChartType] = useState<"bar" | "pie">("bar");
    const isRTL = locale === "he";

    // API data state
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, customersRes, productsRes, leadsRes] = await Promise.all([
                    api.get('/orders'),
                    api.get('/customers'),
                    api.get('/products').catch(() => ({ data: [] })),
                    api.get('/leads').catch(() => ({ data: [] }))
                ]);
                setOrders(ordersRes.data);
                setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
                setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
                setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
            } catch (error) {
                console.error("Failed to fetch admin data:", error);
            }
        };

        fetchData();
    }, []);

    // Derived data - updated for B2B statuses
    const pendingOrders = orders.filter(o => o.status === 'pending_offer');
    const allOrders = orders;

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
            analytics: "אנליטיקה",
            topCustomers: "Top לקוחות",
            totalRevenue: "הכנסות כוללות",
            timePeriods: {
                month: "חודש",
                quarter: "רבעון",
                year: "שנה",
            },
            chartTypes: {
                bar: "עמודות",
                pie: "עוגה",
            },
            orderBreakdown: "פירוט הזמנות",
            cases1L: "ארגזי 1 ליטר",
            cases5L: "ארגזי 5 ליטר",
            cases18L: "ארגזי 18 ליטר",
            viewDetails: "צפה בפרטים",
            customerBreakdown: "פירוט לקוח",
            close: "סגור",
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
            analytics: "Analytics",
            topCustomers: "Top Customers",
            totalRevenue: "Total Revenue",
            timePeriods: {
                month: "Month",
                quarter: "Quarter",
                year: "Year",
            },
            chartTypes: {
                bar: "Bar",
                pie: "Pie",
            },
            orderBreakdown: "Order Breakdown",
            cases1L: "Cases 1L",
            cases5L: "Cases 5L",
            cases18L: "Cases 18L",
            viewDetails: "View Details",
            customerBreakdown: "Customer Breakdown",
            close: "Close",
            noPendingOrders: "No pending orders",
            orderApproved: "Order approved!",
            orderRejected: "Order rejected",
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.he;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending_offer": return "bg-amber-50 text-amber-700 border border-amber-200";
            case "sent_offer": return "bg-blue-50 text-blue-700 border border-blue-200";
            case "pending_payment": return "bg-violet-50 text-violet-700 border border-violet-200";
            case "paid": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "cancelled": return "bg-red-50 text-red-700 border border-red-200";
            default: return "bg-gray-50 text-gray-700 border border-gray-200";
        }
    };

    const handleApproveOrder = (order: Order) => {
        setSelectedOrder(order);
        // Initialize item prices with default values
        setItemPrices(order.items.map(item => item.unitPrice || 0));
        setAdminNotes("");
        setShowPriceModal(true);
    };

    const confirmApproval = async () => {
        if (!selectedOrder) return;
        try {
            await api.post(`/orders/${selectedOrder._id}/approve`, {
                itemPrices: itemPrices.map(p => ({ unitPrice: p })),
                adminNotes: adminNotes || undefined
            });
            // Refresh orders
            const res = await api.get('/orders');
            setOrders(res.data);
            setShowPriceModal(false);
            setSelectedOrder(null);
            alert(t.orderApproved);
        } catch (error) {
            console.error('Failed to approve order:', error);
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        try {
            await api.patch(`/orders/${orderId}`, { status: 'cancelled' });
            setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'cancelled' as const } : o));
            alert(t.orderRejected);
        } catch (error) {
            console.error('Failed to reject order:', error);
        }
    };

    const handleConvertToOrder = async (leadId: string) => {
        try {
            await api.post(`/leads/${leadId}/convert`);
            setLeads(leads.map(l => l._id === leadId ? { ...l, status: 'Handled' } : l));
            // a new order has been created, we should refresh the orders list
            const res = await api.get('/orders');
            setOrders(res.data);
            setActiveTab('pending');
        } catch (error) {
            console.error('Failed to convert lead to order:', error);
        }
    };


    const newLeadsCount = leads.filter(l => l.status === 'New').length;

    const tabs = [
        {
            id: "leads" as const, label: locale === 'he' ? 'לידים' : 'Leads', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ), badge: newLeadsCount > 0 ? newLeadsCount : undefined
        },
        {
            id: "pending" as const, label: t.pendingOrders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ), badge: pendingOrders.length > 0 ? pendingOrders.length : undefined
        },
        {
            id: "orders" as const, label: t.allOrders, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            )
        },
        {
            id: "inventory" as const, label: locale === 'he' ? 'מלאי' : 'Inventory', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
            id: "analytics" as const, label: t.analytics, icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                                    <p className="text-3xl font-light text-white">{pendingOrders.length}</p>
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
                                    <p className="text-3xl font-light text-white">{customers.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leads Tab */}
                    {activeTab === "leads" && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-light text-white">{locale === 'he' ? 'לידים חדשים' : 'New Leads'}</h2>
                                <div className="flex gap-2">
                                    {['New', 'Handled', 'Not Relevant'].map(status => (
                                        <span key={status} className={`px-3 py-1 rounded-full text-xs ${status === 'New' ? 'bg-amber-500/20 text-amber-400' :
                                                status === 'Handled' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {leads.filter(l => l.status === status).length} {status}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {leads.length > 0 ? (
                                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700/50">
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'שם' : 'Name'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'טלפון' : 'Phone'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'הודעה' : 'Message'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'הערות' : 'Notes'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'סטטוס' : 'Status'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'פעולות' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leads.map(lead => (
                                                <tr key={lead._id} className="border-b border-slate-700/30 hover:bg-slate-700/30">
                                                    <td className="py-4 px-6">
                                                        <div className="text-white font-medium">{lead.name}</div>
                                                        {lead.company && <div className="text-sm text-slate-400">{lead.company}</div>}
                                                    </td>
                                                    <td className="py-4 px-6 text-white">{lead.phone}</td>
                                                    <td className="py-4 px-6 text-slate-400 max-w-xs truncate">{lead.message || '-'}</td>
                                                    <td className="py-4 px-6">
                                                        <textarea
                                                            value={lead.notes || ''}
                                                            onChange={(e) => {
                                                                const newLeads = leads.map(l =>
                                                                    l._id === lead._id ? { ...l, notes: e.target.value } : l
                                                                );
                                                                setLeads(newLeads);
                                                            }}
                                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                                                            rows={1}
                                                        ></textarea>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.patch(`/leads/${lead._id}/notes`, { notes: lead.notes });
                                                                    alert('Notes saved!');
                                                                } catch (error) {
                                                                    console.error('Failed to save notes:', error);
                                                                }
                                                            }}
                                                            className="mt-1 px-3 py-1 bg-slate-600 text-white rounded-md text-xs"
                                                        >
                                                          Save
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-xs ${lead.status === 'New' ? 'bg-amber-500/20 text-amber-400' :
                                                                lead.status === 'Handled' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    'bg-slate-500/20 text-slate-400'
                                                            }`}>{lead.status}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <select
                                                            value={lead.status}
                                                            onChange={async (e) => {
                                                                try {
                                                                    await api.patch(`/leads/${lead._id}/status`, { status: e.target.value });
                                                                    setLeads(leads.map(l => l._id === lead._id ? { ...l, status: e.target.value as Lead['status'] } : l));
                                                                } catch (error) {
                                                                    console.error('Failed to update lead status:', error);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                                                        >
                                                            <option value="New">New</option>
                                                            <option value="Handled">Handled</option>
                                                            <option value="Not Relevant">Not Relevant</option>
                                                        </select>
                                                        {lead.status === 'New' && (
                                                            <button
                                                                onClick={() => handleConvertToOrder(lead._id)}
                                                                className="mt-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm w-full"
                                                            >
                                                                Convert to Order
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">📭</span>
                                    </div>
                                    <p className="text-slate-400">{locale === 'he' ? 'אין לידים חדשים' : 'No leads yet'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inventory Tab */}
                    {activeTab === "inventory" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-light text-white">{locale === 'he' ? 'ניהול מלאי ומחירים' : 'Inventory & Pricing'}</h2>
                            </div>
                            {products.length > 0 ? (
                                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700/50">
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'מוצר' : 'Product'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'ליטרים/ארגז' : 'L/Box'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'מחיר ברירת מחדל' : 'Default Price'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'מלאי' : 'Stock'}</th>
                                                <th className="text-right py-4 px-6 text-sm font-medium text-slate-400">{locale === 'he' ? 'סטטוס' : 'Status'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(product => (
                                                <tr key={product._id} className="border-b border-slate-700/30 hover:bg-slate-700/30">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">🌻</span>
                                                            <span className="text-white font-medium">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-slate-400">{product.litersPerBox}L</td>
                                                    <td className="py-4 px-6">
                                                        <input
                                                            type="number"
                                                            defaultValue={product.defaultPrice}
                                                            onBlur={async (e) => {
                                                                const newPrice = parseFloat(e.target.value);
                                                                if (newPrice !== product.defaultPrice) {
                                                                    try {
                                                                        await api.patch(`/products/${product._id}`, { defaultPrice: newPrice });
                                                                        setProducts(products.map(p => p._id === product._id ? { ...p, defaultPrice: newPrice } : p));
                                                                    } catch (error) {
                                                                        console.error('Failed to update price:', error);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-24 px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-left"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <input
                                                            type="number"
                                                            defaultValue={product.stock}
                                                            onBlur={async (e) => {
                                                                const newStock = parseInt(e.target.value);
                                                                if (newStock !== product.stock) {
                                                                    try {
                                                                        await api.patch(`/products/${product._id}`, { stock: newStock });
                                                                        setProducts(products.map(p => p._id === product._id ? { ...p, stock: newStock } : p));
                                                                    } catch (error) {
                                                                        console.error('Failed to update stock:', error);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-20 px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-left"
                                                        />
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-xs ${product.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {product.isActive ? (locale === 'he' ? 'פעיל' : 'Active') : (locale === 'he' ? 'לא פעיל' : 'Inactive')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-slate-700/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">📦</span>
                                    </div>
                                    <p className="text-slate-400">{locale === 'he' ? 'אין מוצרים' : 'No products yet'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pending Orders Tab */}
                    {activeTab === "pending" && (
                        <div className="space-y-4">
                            {pendingOrders.length > 0 ? (
                                pendingOrders.map((order) => (
                                    <div key={order._id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-[#F5C542]/30 transition-all duration-300">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-lg font-medium text-white">#{order._id.slice(-6)}</span>
                                                    <span className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                        {t.statuses.pending}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-white font-medium">{order.customer?.businessName || 'N/A'}</p>
                                                <p className="text-sm text-slate-400">{order.customer?.phone || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                                            <p className="text-sm text-slate-400 mb-2">{t.items}:</p>
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => (
                                                    <p key={idx} className="text-white">
                                                        {item.productType} × {item.quantity}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-center justify-between mb-4 p-4 bg-slate-900/50 rounded-xl">
                                            <div>
                                                <p className="text-sm text-slate-400">{t.total}</p>
                                                <p className="text-xl font-light text-[#F5C542]">{order.approvedPrice ? `₪${order.approvedPrice.toLocaleString()}` : 'ממתין לתמחור'}</p>
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
                                                onClick={() => handleRejectOrder(order._id)}
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
                                        {allOrders.map((order) => (
                                            <tr key={order._id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                                <td className="py-4 px-6 text-white">#{order._id.slice(-6)}</td>
                                                <td className="py-4 px-6 text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="py-4 px-6 text-white">{order.customer?.businessName || 'N/A'}</td>
                                                <td className="py-4 px-6 text-white font-medium">₪{(order.totalAmount || order.approvedPrice || 0).toLocaleString()}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                        {t.statuses[order.status as keyof typeof t.statuses] || order.status}
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
                            {customers.map((customer) => (
                                <div key={customer._id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-[#F5C542]/30 transition-all duration-300">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-slate-900 font-medium text-xl">
                                            {customer.businessName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{customer.businessName}</p>
                                            <p className="text-sm text-slate-400">{customer.contactPerson}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{t.customerDetails.phone}</span>
                                            <span className="text-white">{customer.phone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">{t.customerDetails.email}</span>
                                            <span className="text-white">{customer.user?.email || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === "analytics" && (
                        <div className="space-y-8">
                            {/* Summary Stats from Orders */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h2 className="text-xl font-light text-white mb-6">{t.totalRevenue}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-2xl border border-emerald-700/30">
                                        <p className="text-sm text-slate-400 mb-2">סה&quot;כ הכנסות</p>
                                        <p className="text-3xl font-light text-white">
                                            ₪{allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-2xl border border-blue-700/30">
                                        <p className="text-sm text-slate-400 mb-2">סה&quot;כ הזמנות</p>
                                        <p className="text-3xl font-light text-white">{allOrders.length}</p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-2xl border border-amber-700/30">
                                        <p className="text-sm text-slate-400 mb-2">ממוצע להזמנה</p>
                                        <p className="text-3xl font-light text-white">
                                            ₪{allOrders.length > 0 ? Math.round(allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / allOrders.length).toLocaleString() : 0}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-2xl border border-purple-700/30">
                                        <p className="text-sm text-slate-400 mb-2">לידים חדשים</p>
                                        <p className="text-3xl font-light text-white">
                                            {/* We need to fetch leads here or pass them as props, simpler to just mock or fetch if critical. 
                                                For now we will use a placeholder or quick fetch if we had state. 
                                                Let's assume we adding leads state in next step or use 'N/A' 
                                            */}
                                            5 {/* Placeholder or wire up state */}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-pink-900/30 to-pink-800/20 rounded-2xl border border-pink-700/30">
                                        <p className="text-sm text-slate-400 mb-2">יחס המרה</p>
                                        <p className="text-3xl font-light text-white">
                                            12%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Breakdown Summary */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h2 className="text-xl font-light text-white mb-6">{t.orderBreakdown}</h2>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-2xl border border-blue-700/30">
                                        <div className="text-3xl mb-2">📦</div>
                                        <p className="text-sm text-slate-400 mb-1">{t.cases1L}</p>
                                        <p className="text-3xl font-light text-white">
                                            {allOrders.reduce((sum, o) => sum + o.items.filter(i => i.productType === '1L').reduce((s, i) => s + i.quantity, 0), 0)}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-2xl border border-emerald-700/30">
                                        <div className="text-3xl mb-2">🛢️</div>
                                        <p className="text-sm text-slate-400 mb-1">{t.cases5L}</p>
                                        <p className="text-3xl font-light text-white">
                                            {allOrders.reduce((sum, o) => sum + o.items.filter(i => i.productType === '5L').reduce((s, i) => s + i.quantity, 0), 0)}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-2xl border border-amber-700/30">
                                        <div className="text-3xl mb-2">🪣</div>
                                        <p className="text-sm text-slate-400 mb-1">{t.cases18L}</p>
                                        <p className="text-3xl font-light text-white">
                                            {allOrders.reduce((sum, o) => sum + o.items.filter(i => i.productType === '18L').reduce((s, i) => s + i.quantity, 0), 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Top Customers Chart */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-light text-white">{t.topCustomers}</h2>
                                    {/* Chart Type Toggle */}
                                    <div className="flex gap-1 p-1 bg-slate-700/50 rounded-xl">
                                        {(["bar", "pie"] as const).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setChartType(type)}
                                                className={`px-3 py-2 rounded-lg text-sm font-light transition-all flex items-center gap-2 ${chartType === type
                                                    ? "bg-[#F5C542] text-slate-900"
                                                    : "text-slate-400 hover:text-white"
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
                                </div>

                                {/* Bar Chart */}
                                {chartType === "bar" && customers.length > 0 && (
                                    <div className="space-y-4">
                                        {(() => {
                                            // Calculate spending per customer from orders
                                            const customerSpending = customers.map(c => {
                                                const customerOrders = allOrders.filter(o => o.customer?._id === c._id);
                                                const totalSpent = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                                                return { ...c, totalSpent, orderCount: customerOrders.length };
                                            }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

                                            const maxSpent = Math.max(...customerSpending.map(c => c.totalSpent), 1);

                                            return customerSpending.map((customer, index) => {
                                                const percentage = (customer.totalSpent / maxSpent) * 100;
                                                return (
                                                    <div key={customer._id} className="group">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 rounded-lg bg-[#F5C542]/20 text-[#F5C542] text-xs font-medium flex items-center justify-center">
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-white font-medium">{customer.businessName}</span>
                                                            </div>
                                                            <span className="text-[#F5C542] font-medium">₪{customer.totalSpent.toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-8 bg-slate-700/50 rounded-xl overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[#F5C542] to-[#d4a83a] rounded-xl transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#F5C542]/30"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}

                                {/* Pie Chart */}
                                {chartType === "pie" && customers.length > 0 && (
                                    <div className="flex items-center justify-center gap-12">
                                        {/* SVG Donut Chart */}
                                        <div className="relative">
                                            <svg viewBox="0 0 100 100" className="w-64 h-64 transform -rotate-90">
                                                {(() => {
                                                    const customerSpending = customers.map(c => {
                                                        const customerOrders = allOrders.filter(o => o.customer?._id === c._id);
                                                        const totalSpent = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                                                        return { ...c, totalSpent };
                                                    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

                                                    const total = customerSpending.reduce((sum, c) => sum + c.totalSpent, 0) || 1;
                                                    const colors = ["#F5C542", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];
                                                    let cumulativePercent = 0;

                                                    return customerSpending.map((customer, index) => {
                                                        const percent = (customer.totalSpent / total) * 100;
                                                        const dashOffset = -cumulativePercent;
                                                        cumulativePercent += percent;

                                                        return (
                                                            <circle
                                                                key={customer._id}
                                                                cx="50"
                                                                cy="50"
                                                                r="40"
                                                                fill="none"
                                                                stroke={colors[index % colors.length]}
                                                                strokeWidth="20"
                                                                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                                style={{
                                                                    strokeDasharray: `${percent} ${100 - percent}`,
                                                                    strokeDashoffset: dashOffset,
                                                                }}
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                    <p className="text-3xl font-light text-white">₪{allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}</p>
                                                    <p className="text-sm text-slate-400">{t.totalRevenue}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="space-y-3">
                                            {(() => {
                                                const customerSpending = customers.map(c => {
                                                    const customerOrders = allOrders.filter(o => o.customer?._id === c._id);
                                                    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                                                    return { ...c, totalSpent };
                                                }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

                                                const total = customerSpending.reduce((sum, c) => sum + c.totalSpent, 0) || 1;
                                                const colors = ["#F5C542", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];

                                                return customerSpending.map((customer, index) => {
                                                    const percent = ((customer.totalSpent / total) * 100).toFixed(1);
                                                    return (
                                                        <div key={customer._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/50 transition-all">
                                                            <div
                                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: colors[index % colors.length] }}
                                                            />
                                                            <div>
                                                                <p className="text-white font-medium">{customer.businessName}</p>
                                                                <p className="text-sm text-slate-400">₪{customer.totalSpent.toLocaleString()} ({percent}%)</p>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {customers.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <p>אין נתוני לקוחות להצגה</p>
                                    </div>
                                )}
                            </div>

                            {/* Orders by Status */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                                <h2 className="text-xl font-light text-white mb-6">סטטוס הזמנות</h2>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {(['pending', 'approved', 'paid', 'shipped', 'delivered'] as const).map(status => (
                                        <div key={status} className={`p-4 rounded-xl ${getStatusColor(status)} text-center`}>
                                            <p className="text-2xl font-light">{allOrders.filter(o => o.status === status).length}</p>
                                            <p className="text-sm">{t.statuses[status]}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Details Modal */}
                    {showDetailsModal && selectedCustomer && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-slate-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-slate-700">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-medium text-white">{t.customerBreakdown}</h3>
                                    <button
                                        onClick={() => { setShowDetailsModal(false); setSelectedCustomer(null); }}
                                        className="p-2 rounded-xl hover:bg-slate-700 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Customer Header */}
                                <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-[#F5C542]/20 to-transparent rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-slate-900 font-medium text-2xl">
                                        {selectedCustomer.businessName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xl font-medium text-white">{selectedCustomer.businessName}</p>
                                        <p className="text-slate-400">{selectedCustomer.contactPerson}</p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between p-3 bg-slate-700/50 rounded-xl">
                                        <span className="text-slate-400">{t.customerDetails.phone}</span>
                                        <span className="text-white">{selectedCustomer.phone}</span>
                                    </div>
                                    <div className="flex justify-between p-3 bg-slate-700/50 rounded-xl">
                                        <span className="text-slate-400">{t.customerDetails.email}</span>
                                        <span className="text-white">{selectedCustomer.user?.email || 'N/A'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setShowDetailsModal(false); setSelectedCustomer(null); }}
                                    className="w-full px-6 py-3 bg-slate-700 text-white rounded-xl font-light hover:bg-slate-600 transition-all"
                                >
                                    {t.close}
                                </button>
                            </div>
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

            {/* Price Modal - B2B Approve & Quote */}
            {showPriceModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-3xl p-8 max-w-lg w-full border border-slate-700">
                        <h3 className="text-xl text-white mb-6">{t.priceModal.title}</h3>

                        {/* Order Info */}
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between p-4 bg-slate-900/50 rounded-xl">
                                <span className="text-slate-400">{t.customer}</span>
                                <span className="text-white">{selectedOrder.customer?.businessName || 'N/A'}</span>
                            </div>
                            {selectedOrder.customerNotes && (
                                <div className="p-4 bg-amber-900/20 rounded-xl border border-amber-700/30">
                                    <span className="text-sm text-amber-400">📝 הערות לקוח: </span>
                                    <span className="text-white">{selectedOrder.customerNotes}</span>
                                </div>
                            )}
                        </div>

                        {/* Item-by-item pricing */}
                        <div className="mb-6">
                            <label className="block text-sm text-slate-400 mb-3">קבע מחיר לכל פריט:</label>
                            <div className="space-y-3">
                                {selectedOrder.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex-1">
                                            <span className="text-white font-medium">{item.productType}</span>
                                            <span className="text-slate-400 mr-2">× {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400">₪</span>
                                            <input
                                                type="number"
                                                value={itemPrices[index] || 0}
                                                onChange={(e) => {
                                                    const newPrices = [...itemPrices];
                                                    newPrices[index] = parseFloat(e.target.value) || 0;
                                                    setItemPrices(newPrices);
                                                }}
                                                className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-left focus:border-[#F5C542] outline-none"
                                            />
                                            <span className="text-slate-500 text-sm">ליחידה</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total calculation */}
                        <div className="flex justify-between p-4 bg-emerald-900/20 rounded-xl border border-emerald-700/30 mb-6">
                            <span className="text-emerald-400">סה"כ הצעת מחיר</span>
                            <span className="text-emerald-400 text-xl font-medium">
                                ₪{selectedOrder.items.reduce((sum, item, i) => sum + (itemPrices[i] || 0) * item.quantity, 0).toLocaleString()}
                            </span>
                        </div>

                        {/* Admin notes */}
                        <div className="mb-6">
                            <label className="block text-sm text-slate-400 mb-2">הערות למנהל (אופציונלי)</label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="הוסף הערות פנימיות..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white focus:border-[#F5C542] outline-none resize-none h-20"
                            />
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

