"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { dashboardTranslations } from "./dashboardTranslations";
import { prepareAvatar } from "@/app/lib/avatar";

interface CustomerDashboardProps {
    locale: string;
}

interface OrderItem {
    productName?: string;
    productType?: string;
    quantity: number;
    price?: number;
}

type PaymentPreference = "bank_transfer" | "credit_card";

interface Order {
    _id: string;
    status: string;
    items: OrderItem[];
    totalAmount: number;
    notes?: string;
    rejectionReason?: string;
    // Optional: orders placed before the payment-preference feature have none.
    paymentPreference?: PaymentPreference;
    createdAt: string;
}

interface Invoice {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    issuedAt: string;
    status?: "draft" | "issued" | "paid" | "cancelled";
    pdfUrl?: string;
}

// Customer-safe catalog item from GET /api/v1/me/catalog — Product rows plus
// legacy Settings.boxPrices fallback rows, already merged and deduped by the
// backend (Product wins). `available === null` means no stock limit applies.
interface CatalogItem {
    productId?: string;
    sku: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    unit?: string;
    stockTrackingEnabled: boolean;
    available: number | null;
    isLegacy: boolean;
}

// Settings now only feeds genuinely global order settings (minimum amount,
// currency) — the product list itself comes from the catalog endpoint.
interface BusinessSettings {
    minimumOrderAmount: number;
    currency: string;
    paymentOptions?: {
        bankTransfer: {
            enabled: boolean;
            bankName?: string;
            branch?: string;
            accountNumber?: string;
            accountName?: string;
            iban?: string;
            swift?: string;
            bankAddress?: string;
        };
        creditCard: {
            enabled: boolean;
            paymentUrl?: string;
        };
    };
}

// Mirrors backend utils/paymentOptions.ts. Used only for rendering payment
// details of previously-approved card orders — never for offering the
// method at checkout.
function isUsableCardPaymentUrl(url: string | undefined): boolean {
    return !!url && url.startsWith("https://") && !/payment-demo/.test(url);
}

// Mirrors backend enabledPaymentMethods: credit card is NOT offered until a
// verified provider integration exists (a static admin link gives no payment
// confirmation). The backend enforces the same rule — this is presentation.
function availablePaymentMethods(settings: BusinessSettings | null): PaymentPreference[] {
    return settings?.paymentOptions?.bankTransfer.enabled ? ["bank_transfer"] : [];
}



export default function CustomerDashboard({ locale }: CustomerDashboardProps) {
    const { user, logout, updateUser, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "profile" | "newOrder">("orders");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Initial profile state from user context, will be updated by API
    const [profile, setProfile] = useState({
        companyName: "",
        contactPerson: "",
        businessType: "",
        taxId: "",
        email: user?.email || "",
        phone: "",
        address: "",
        city: "",
        profileImage: null as string | null,
    });
    const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentPreference | "">("");
    // Idempotency key for the CURRENT checkout attempt: minted when the
    // confirmation modal opens, so a double-click or network retry of the
    // same confirmation can never create two orders (backend dedupes on it).
    const [clientRequestId, setClientRequestId] = useState<string>("");
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [submittingOrder, setSubmittingOrder] = useState(false);
    const isRTL = locale === "he";

    // Orders State
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [hasProfile, setHasProfile] = useState(false);

    // Invoices State
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        try {
            const response = await api.get('/v1/me/orders');
            setOrders(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        }
    }, [user]);

    useEffect(() => {

        const fetchInvoices = async () => {
            if (!user) return;
            try {
                const response = await api.get('/invoices');
                setInvoices(response.data.data || []);
            } catch (error) {
                console.error("Failed to fetch invoices:", error);
            }
        };

        const fetchProfile = async () => {
            try {
                // CHANGED: Fetch from new /users/me endpoint
                const response = await api.get('/users/me');
                const userData = response.data.data.user; // { ...user, company: { ... } }

                if (userData && userData.company) {
                    const company = userData.company;

                    // Approval-flow users must complete delivery/invoice
                    // details before ordering — the backend enforces this too
                    // (403 ORDER_PROFILE_INCOMPLETE). Legacy accounts without
                    // registrationMethod are not redirected.
                    if (userData.registrationMethod) {
                        const orderProfileComplete = [company.address, company.city, company.billingAddress, company.billingEmail]
                            .every((value: unknown) => typeof value === "string" && value.trim() !== "");
                        if (!orderProfileComplete) {
                            router.replace(`/${locale}/onboarding`);
                            return;
                        }
                    }

                    setHasProfile(true);
                    setProfile({
                        companyName: company.name,
                        contactPerson: userData.name || "", // User name is contact person
                        businessType: "Unknown", // Field not in new schema yet, default it
                        taxId: company.vatNumber || "",
                        email: company.email || userData.email || "",
                        phone: company.phone || "",
                        address: company.address || "", // Now simple string
                        city: company.city || "",       // Now simple string
                        profileImage: userData.avatar || null,
                    });

                    // Also update auth context if avatar changed? 
                    // ideally auth context should be source of truth for user.avatar
                } else {
                    setHasProfile(false);
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                // If 404/error, assumes no profile
                setHasProfile(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                const data: BusinessSettings = res.data.data;
                setSettings(data);
            } catch (err) {
                console.error("Failed to fetch settings:", err);
            }
        };

        const fetchCatalog = async () => {
            try {
                const res = await api.get('/v1/me/catalog');
                const items: CatalogItem[] = res.data.data || [];
                setCatalog(items);
                // Initialise a zero quantity for every orderable catalog item
                const initial: Record<string, number> = {};
                items.forEach(item => { initial[item.sku] = 0; });
                setOrderQuantities(initial);
            } catch (err) {
                console.error("Failed to fetch catalog:", err);
            }
        };

        if (user) {
            fetchOrders();
            fetchInvoices();
            fetchProfile();
            fetchSettings();
            fetchCatalog();
        }
    }, [user, fetchOrders, locale, router]);

    const handleSaveProfile = async () => {
        try {
            const payload = {
                companyName: profile.companyName,
                vatNumber: profile.taxId,
                phone: profile.phone,
                address: profile.address,
                city: profile.city,
                email: profile.email,
            };

            if (hasProfile) {
                await api.patch('/v1/me/profile', payload);
            } else {
                await api.post('/v1/me/profile/complete', payload);
            }

            setHasProfile(true);
            setIsEditingProfile(false);
            toast.success(t.profileSaved);
        } catch (error: unknown) {
            console.error("Failed to save profile:", error);
            toast.error(t.profileSaveFailed);
        }
    };

    const selectedOrderItems = (): { sku: string; quantity: number }[] => {
        const items: { sku: string; quantity: number }[] = [];
        for (const product of catalog) {
            const qty = orderQuantities[product.sku] || 0;
            if (qty > 0) items.push({ sku: product.sku, quantity: qty });
        }
        return items;
    };

    const handleSubmitOrder = () => {
        if (!hasProfile) {
            toast.error(t.completeProfileFirst);
            setActiveTab("profile");
            setIsEditingProfile(true);
            return;
        }

        const items = selectedOrderItems();
        if (items.length === 0) {
            toast.error(t.selectAtLeastOne);
            return;
        }

        const enabledMethods = availablePaymentMethods(settings);
        if (enabledMethods.length === 0) {
            toast.error(t.paymentMethodsDisabled);
            return;
        }

        const orderTotal = catalog.reduce(
            (sum, product) => sum + product.price * (orderQuantities[product.sku] || 0),
            0,
        );
        const minAmount = settings?.minimumOrderAmount ?? 0;
        const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₪';
        if (minAmount > 0 && orderTotal < minAmount) {
            toast.error(`${t.minOrder}: ${currencySymbol}${minAmount.toLocaleString()}. ${t.currentAmount}: ${currencySymbol}${orderTotal.toLocaleString()}`);
            return;
        }

        setPaymentMethod(enabledMethods.length === 1 ? enabledMethods[0] : "");
        setClientRequestId(crypto.randomUUID());
        setPaymentModalOpen(true);
    };

    const handleConfirmOrder = async () => {
        const items = selectedOrderItems();
        const enabledMethods = availablePaymentMethods(settings);
        if (!paymentMethod || !enabledMethods.includes(paymentMethod)) {
            toast.error(t.selectPaymentMethod);
            return;
        }

        setSubmittingOrder(true);
        try {
            await api.post('/v1/me/orders', {
                items,
                paymentPreference: paymentMethod,
                ...(clientRequestId ? { clientRequestId } : {}),
            });
            toast.success(t.orderSubmitted);

            // Reset form
            setOrderQuantities(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 0])));
            setPaymentModalOpen(false);
            setPaymentMethod("");
            setClientRequestId("");
            setActiveTab("orders");

            // Refresh orders
            const response = await api.get('/v1/me/orders');
            setOrders(response.data.data || []);
        } catch (error: unknown) {
            console.error("Failed to submit order:", error);
            const err = error as { response?: { status?: number; data?: { message?: string; error?: string } }; message?: string };
            if (err.response?.status === 403 && err.response?.data?.error === "ORDER_PROFILE_INCOMPLETE") {
                toast.error(t.completeDetailsFirst);
                router.push(`/${locale}/onboarding`);
            } else if (err.response?.status === 401) {
                toast.error(t.sessionExpired);
            } else {
                toast.error(t.orderSubmitFailed);
            }
        } finally {
            setSubmittingOrder(false);
        }
    };


    const t = dashboardTranslations[locale as keyof typeof dashboardTranslations] || dashboardTranslations.he;

    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₪';
    const orderTotal = catalog.reduce((sum, item) => sum + item.price * (orderQuantities[item.sku] || 0), 0);
    const minAmount = settings?.minimumOrderAmount ?? 0;

    // Only admin-enabled, actually-usable payment methods are offered; the
    // backend enforces the same rule, so this is presentation + early
    // feedback, not the gate.
    const enabledPaymentMethods = availablePaymentMethods(settings);
    const paymentMethodLabels: Record<PaymentPreference, string> = {
        bank_transfer: t.bankTransfer,
        credit_card: t.creditCardMethod,
    };

    // A single enabled method is preselected but stays visible as a checked
    // radio; with two methods the customer must choose explicitly.
    useEffect(() => {
        if (enabledPaymentMethods.length === 1) {
            setPaymentMethod(enabledPaymentMethods[0]);
        } else if (paymentMethod && !enabledPaymentMethods.includes(paymentMethod)) {
            setPaymentMethod("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);

    // Known availability limit for a catalog item; null = unlimited/untracked.
    // The backend re-validates on approval — this only prevents avoidable
    // invalid requests in the UI.
    const availabilityLimit = (item: CatalogItem): number | null =>
        item.stockTrackingEnabled && item.available !== null ? item.available : null;
    const isOutOfStock = (item: CatalogItem): boolean => {
        const limit = availabilityLimit(item);
        return limit !== null && limit <= 0;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":   return "bg-amber-50 text-amber-700 border border-amber-200";
            case "approved":  return "bg-blue-50 text-blue-700 border border-blue-200";
            case "rejected":  return "bg-red-50 text-red-700 border border-red-200";
            case "shipped":   return "bg-indigo-50 text-indigo-700 border border-indigo-200";
            case "completed": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "cancelled": return "bg-red-50 text-red-700 border border-red-200";
            default:          return "bg-gray-50 text-gray-700 border border-gray-200";
        }
    };

    const getInvoiceStatusColor = (status: string) => {
        switch (status) {
            case "draft":     return "bg-gray-50 text-gray-600 border border-gray-200";
            case "issued":    return "bg-blue-50 text-blue-700 border border-blue-200";
            case "paid":      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "cancelled": return "bg-red-50 text-red-700 border border-red-200";
            default:          return "bg-gray-50 text-gray-700 border border-gray-200";
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

    const clampQuantity = (item: CatalogItem, quantity: number): number => {
        const limit = availabilityLimit(item);
        const clamped = Math.max(0, quantity);
        return limit === null ? clamped : Math.min(clamped, limit);
    };

    const updateQuantity = (item: CatalogItem, delta: number) => {
        setOrderQuantities(prev => ({
            ...prev,
            [item.sku]: clampQuantity(item, (prev[item.sku] || 0) + delta)
        }));
    };

    const handleProfileImageUpload = () => {
        if (!avatarUploading) avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        try {
            const preparedAvatar = await prepareAvatar(file);
            const response = await api.patch("/v1/me/avatar", { avatar: preparedAvatar });
            const savedAvatar = response.data?.data?.avatar || preparedAvatar;
            setProfile((current) => ({ ...current, profileImage: savedAvatar }));
            updateUser({ avatar: savedAvatar });
            toast.success(t.avatarUploadSuccess);
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            toast.error(t.avatarUploadError);
        } finally {
            setAvatarUploading(false);
            event.target.value = "";
        }
    };

    const avatarSrc = profile.profileImage || user?.avatar || user?.profilePicture || null;

    // Session validated and gone (expired cookie, logout elsewhere) — go to
    // login. AuthPage only redirects here when a session EXISTS, so the two
    // guards can never loop.
    useEffect(() => {
        if (authLoading || user) return;
        router.replace(`/${locale}/auth`);
    }, [authLoading, user, locale, router]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <div className="w-10 h-10 border-2 border-[#F5C542] border-t-transparent rounded-full animate-spin" aria-label="Loading" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 ${isRTL ? "rtl" : "ltr"}`}>
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="sr-only"
                tabIndex={-1}
            />
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
                                className="flex min-h-11 items-center gap-4 rounded-2xl p-2 transition-all duration-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
                                aria-label={t.profileMenu}
                                aria-expanded={showProfileMenu}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900">{profile.companyName}</p>
                                    <p className="text-xs text-gray-500">{t.welcome}</p>
                                </div>

                                {/* Profile Picture */}
                                <div className="relative group">
                                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-medium text-lg shadow-lg shadow-[#F5C542]/20 overflow-hidden">
                                        {avatarSrc ? (
                                            <Image
                                                src={avatarSrc}
                                                alt={t.profilePhotoAlt}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                                unoptimized={avatarSrc.startsWith("data:")}
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            profile.companyName.charAt(0) || user?.firstName?.charAt(0) || '?'
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
                                        disabled={avatarUploading}
                                        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-right text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F5C542] disabled:cursor-wait disabled:opacity-60"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {avatarUploading ? t.uploadingPhoto : t.uploadPhoto}
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
                                    <button
                                        onClick={() => {
                                            logout();
                                            setShowProfileMenu(false);
                                        }}
                                        className="w-full px-4 py-3 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        {t.logout}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                {/* Premium Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#F5C542]/20 transition-all duration-500 hover:-translate-y-1 animate-fade-in-delay">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-7 h-7 text-[#F5C542]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{t.stats.totalOrders}</p>
                                <p className="text-3xl font-light text-gray-900">{orders.length}</p>
                            </div>
                        </div>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'secretary') && (
                        <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-500 hover:-translate-y-1 animate-fade-in-delay-2">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">{t.stats.totalSpent}</p>
                                    <p className="text-3xl font-light text-gray-900">₪{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-1 animate-fade-in-delay-3">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{t.stats.pendingOrders}</p>
                                <p className="text-3xl font-light text-gray-900">{orders.filter(o => o.status === 'pending').length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Tabs Container */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
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
                                    {catalog.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8">{t.noProducts}</p>
                                    ) : catalog.map((product) => {
                                        const soldOut = isOutOfStock(product);
                                        const limit = availabilityLimit(product);
                                        return (
                                        <div key={product.sku} className={`group flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 transition-all duration-300 ${soldOut ? "opacity-60" : "hover:border-[#F5C542]/30 hover:shadow-lg"}`}>
                                            <div className="flex items-center gap-5">
                                                <div className="w-20 h-20 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                                                    📦
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-lg">{product.name}</p>
                                                    {product.price > 0 && (
                                                        <p className="text-sm text-gray-500">{currencySymbol}{product.price.toLocaleString()} / {t.perUnit}</p>
                                                    )}
                                                    {soldOut ? (
                                                        <p className="text-xs font-medium text-red-600 mt-1">{t.outOfStock}</p>
                                                    ) : limit !== null && (
                                                        <p className="text-xs text-gray-400 mt-1">{t.availableStock}: {limit.toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateQuantity(product, -1)}
                                                    disabled={soldOut}
                                                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 hover:border-[#F5C542] hover:bg-[#F5C542]/5 transition-all duration-300 flex items-center justify-center text-xl font-light text-gray-600 hover:text-[#F5C542] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200"
                                                >
                                                    −
                                                </button>
                                                <div className="w-24 text-center">
                                                    <input
                                                        type="number"
                                                        value={orderQuantities[product.sku] || 0}
                                                        onChange={(e) => setOrderQuantities(prev => ({ ...prev, [product.sku]: clampQuantity(product, parseInt(e.target.value) || 0) }))}
                                                        min={0}
                                                        max={limit ?? undefined}
                                                        disabled={soldOut}
                                                        className="w-full text-center text-xl font-light px-3 py-3 rounded-xl border border-gray-200 focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">{t.perUnit}</p>
                                                </div>
                                                <button
                                                    onClick={() => updateQuantity(product, 1)}
                                                    disabled={soldOut || (limit !== null && (orderQuantities[product.sku] || 0) >= limit)}
                                                    className="w-12 h-12 rounded-xl bg-white border border-gray-200 hover:border-[#F5C542] hover:bg-[#F5C542]/5 transition-all duration-300 flex items-center justify-center text-xl font-light text-gray-600 hover:text-[#F5C542] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>

                                {/* Order total + minimum order info */}
                                <div className="bg-gradient-to-r from-[#F5C542]/10 to-[#F5C542]/5 rounded-2xl p-5 mb-4 border border-[#F5C542]/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-gray-700 flex items-center gap-3">
                                            <span className="text-xl">💡</span>
                                            {t.orderNote}
                                        </p>
                                        {orderTotal > 0 && (
                                            <p className="text-sm font-medium text-gray-900">
                                                {t.total}: {currencySymbol}{orderTotal.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    {minAmount > 0 && (
                                        <p className={`text-xs mt-1 ${orderTotal > 0 && orderTotal < minAmount ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                            {t.minOrder}: {currencySymbol}{minAmount.toLocaleString()}
                                            {orderTotal > 0 && orderTotal < minAmount && ` — ${t.missingAmount} ${currencySymbol}${(minAmount - orderTotal).toLocaleString()}`}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={catalog.length === 0}
                                    className="w-full px-8 py-5 bg-gradient-to-r from-[#F5C542] to-[#d4a83a] text-white rounded-2xl font-light text-lg tracking-wide hover:shadow-xl hover:shadow-[#F5C542]/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {t.submitOrder}
                                </button>
                            </div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <div>
                                <h2 className="text-3xl font-extralight text-gray-900 mb-8">{t.myOrders}</h2>

                                {orders.length > 0 ? (
                                    <div className="space-y-4">
                                        {orders.map((order) => (
                                            <div key={order._id} className="group p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#F5C542]/30 hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-[#F5C542]/20 to-[#F5C542]/5 rounded-2xl flex items-center justify-center">
                                                            <span className="text-2xl">📦</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">#{order._id.slice(-6).toUpperCase()}</p>
                                                            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-left">
                                                            <p className="text-sm text-gray-500">{order.items.length} {t.items}</p>
                                                            <p className="font-medium text-gray-900">₪{order.totalAmount.toLocaleString()}</p>
                                                        </div>
                                                        <span className={`px-4 py-2 rounded-xl text-xs font-medium ${getStatusColor(order.status)}`}>
                                                            {t.statuses[order.status as keyof typeof t.statuses] || order.status}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                className="text-[#F5C542] hover:text-[#d4a83a] px-4 py-2 rounded-xl hover:bg-[#F5C542]/5 transition-all"
                                                            >
                                                                {t.view}
                                                            </button>
                                                        </div>
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

                                {invoices.length > 0 ? (
                                    <div className="space-y-4">
                                        {invoices.map((invoice) => (
                                            <div key={invoice._id} className="group p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#F5C542]/30 hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center">
                                                            <span className="text-2xl">📄</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                                                            <p className="text-sm text-gray-500">{new Date(invoice.issuedAt).toLocaleDateString()} • {t.orderRef}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <p className="font-medium text-gray-900 text-lg">₪{invoice.totalAmount.toLocaleString()}</p>
                                                        {invoice.status && (
                                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}>
                                                                {t.invoiceStatuses[invoice.status] || invoice.status}
                                                            </span>
                                                        )}
                                                        {invoice.pdfUrl ? (
                                                            <a
                                                                href={invoice.pdfUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                aria-label={`${t.download} — ${invoice.invoiceNumber}`}
                                                                className="flex items-center gap-2 text-[#F5C542] hover:text-[#d4a83a] px-5 py-3 rounded-xl hover:bg-[#F5C542]/5 border border-[#F5C542]/30 transition-all"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                {t.download}
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">{t.pdfPending}</span>
                                                        )}
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
                                            disabled={avatarUploading}
                                            aria-label={t.uploadPhoto}
                                            className="group relative min-h-11 min-w-11 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                                        >
                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#F5C542] to-[#d4a83a] flex items-center justify-center text-white font-light text-3xl shadow-xl shadow-[#F5C542]/30 overflow-hidden">
                                                {avatarSrc ? (
                                                    <Image
                                                        src={avatarSrc}
                                                        alt={t.profilePhotoAlt}
                                                        fill
                                                        className="object-cover"
                                                        sizes="96px"
                                                        unoptimized={avatarSrc.startsWith("data:")}
                                                        referrerPolicy="no-referrer"
                                                    />
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
                                            <p className="mt-1 text-xs text-gray-400">
                                                {avatarUploading ? t.uploadingPhoto : t.photoRequirements}
                                            </p>
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
                                                    onClick={handleSaveProfile}
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
            {/* Payment choice appears only after the customer asks to submit.
                No order reaches the backend until this dialog is confirmed. */}
            {paymentModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="payment-choice-title"
                >
                    <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-7 shadow-2xl">
                        <div className="mb-6">
                            <h3 id="payment-choice-title" className="text-2xl font-light text-gray-900">
                                {t.choosePaymentMethod}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">{t.choosePaymentMethodHint}</p>
                        </div>

                        <div className="space-y-3" role="radiogroup" aria-label={t.choosePaymentMethod}>
                            {enabledPaymentMethods.map((method) => (
                                <label
                                    key={method}
                                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all ${paymentMethod === method
                                        ? "border-[#F5C542] bg-[#F5C542]/5 ring-1 ring-[#F5C542]/40"
                                        : "border-gray-200 bg-white hover:border-[#F5C542]/40"}`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethodModal"
                                        value={method}
                                        checked={paymentMethod === method}
                                        onChange={() => setPaymentMethod(method)}
                                        className="h-4 w-4 accent-[#F5C542]"
                                    />
                                    <span className="text-2xl" aria-hidden>{method === "bank_transfer" ? "🏦" : "💳"}</span>
                                    <span className="font-medium text-gray-900">{paymentMethodLabels[method]}</span>
                                </label>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-500">{t.total}</span>
                                <span className="font-medium text-gray-900">
                                    {currencySymbol}{orderTotal.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="mt-7 flex gap-3">
                            <button
                                type="button"
                                disabled={submittingOrder}
                                onClick={() => {
                                    setPaymentModalOpen(false);
                                    setPaymentMethod("");
                                }}
                                className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="button"
                                disabled={!paymentMethod || submittingOrder}
                                onClick={handleConfirmOrder}
                                className="flex-1 rounded-xl bg-gradient-to-r from-[#F5C542] to-[#d4a83a] px-5 py-3 font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submittingOrder ? t.submittingOrder : t.confirmOrder}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in border border-gray-100">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-light text-gray-900">{t.orderNumber} #{selectedOrder._id.slice(-6).toUpperCase()}</h3>
                                    <p className="text-gray-500 mt-1">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                                <span className={`px-4 py-2 rounded-xl text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                                    {t.statuses[selectedOrder.status as keyof typeof t.statuses] || selectedOrder.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                                <h4 className="font-medium text-gray-900 mb-4">{t.items}</h4>
                                <div className="space-y-4">
                                    {selectedOrder.items.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                                                    🌻
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.productName || item.productType}</p>
                                                    {item.price != null && item.price > 0 && (
                                                        <p className="text-sm text-gray-500">₪{item.price.toLocaleString()} / {t.perUnit}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="font-medium text-gray-900">x{item.quantity}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.status === "rejected" && selectedOrder.rejectionReason && (
                                <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">
                                    <h4 className="font-medium text-red-900">{t.rejectionReason}</h4>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-red-800">{selectedOrder.rejectionReason}</p>
                                </div>
                            )}

                            {selectedOrder.paymentPreference && (
                                <div className="mb-6 flex items-center gap-2 text-sm text-gray-700">
                                    <span className="text-gray-500">{t.paymentMethodLabel}:</span>
                                    <span className="font-medium text-gray-900">
                                        {selectedOrder.paymentPreference === "bank_transfer" ? t.bankTransfer : t.creditCardMethod}
                                    </span>
                                </div>
                            )}

                            {/* Approved orders show ONLY the customer's selected payment
                                option. Orders placed before the preference feature (no
                                paymentPreference) keep showing every enabled option. */}
                            {selectedOrder.status === "approved" && settings?.paymentOptions && (
                                <div className="mb-8 rounded-2xl border border-[#F5C542]/40 bg-[#F5C542]/5 p-5">
                                    <h4 className="font-medium text-gray-900">{t.paymentOptions}</h4>
                                    {settings.paymentOptions.bankTransfer.enabled
                                        && (!selectedOrder.paymentPreference || selectedOrder.paymentPreference === "bank_transfer") && (
                                        <div className="mt-4 rounded-xl bg-white p-4 text-sm text-gray-700">
                                            <p className="font-medium text-gray-900">{t.bankTransfer}</p>
                                            <dl className="mt-2 space-y-1">
                                                {settings.paymentOptions.bankTransfer.bankName && <div>{t.bankName}: {settings.paymentOptions.bankTransfer.bankName}</div>}
                                                {settings.paymentOptions.bankTransfer.branch && <div>{t.branch}: {settings.paymentOptions.bankTransfer.branch}</div>}
                                                {settings.paymentOptions.bankTransfer.accountNumber && <div>{t.accountNumber}: {settings.paymentOptions.bankTransfer.accountNumber}</div>}
                                                {settings.paymentOptions.bankTransfer.accountName && <div>{t.accountName}: {settings.paymentOptions.bankTransfer.accountName}</div>}
                                                {settings.paymentOptions.bankTransfer.iban && <div dir="ltr">IBAN: {settings.paymentOptions.bankTransfer.iban}</div>}
                                                {settings.paymentOptions.bankTransfer.swift && <div dir="ltr">SWIFT/BIC: {settings.paymentOptions.bankTransfer.swift}</div>}
                                                {settings.paymentOptions.bankTransfer.bankAddress && <div>{t.bankAddress}: {settings.paymentOptions.bankTransfer.bankAddress}</div>}
                                                <div className="pt-1 font-medium">{t.transferReference}: #{selectedOrder._id.slice(-8).toUpperCase()}</div>
                                            </dl>
                                            <p className="mt-3 text-xs text-gray-500">{t.sendProofOfTransfer}</p>
                                        </div>
                                    )}
                                    {settings.paymentOptions.creditCard.enabled
                                        && isUsableCardPaymentUrl(settings.paymentOptions.creditCard.paymentUrl)
                                        && (!selectedOrder.paymentPreference || selectedOrder.paymentPreference === "credit_card") && (
                                        <a
                                            href={settings.paymentOptions.creditCard.paymentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 block w-full rounded-xl bg-[#F5C542] px-5 py-3 text-center font-medium text-white transition-colors hover:bg-[#d4a83a]"
                                        >
                                            {t.payByCard}
                                        </a>
                                    )}
                                    {!settings.paymentOptions.bankTransfer.enabled && !settings.paymentOptions.creditCard.enabled && (
                                        <p className="mt-2 text-sm text-gray-500">{t.paymentUnavailable}</p>
                                    )}
                                    {selectedOrder.paymentPreference === "bank_transfer" && !settings.paymentOptions.bankTransfer.enabled && (
                                        <p className="mt-2 text-sm text-gray-500">{t.paymentUnavailable}</p>
                                    )}
                                    {selectedOrder.paymentPreference === "credit_card"
                                        && !(settings.paymentOptions.creditCard.enabled
                                            && isUsableCardPaymentUrl(settings.paymentOptions.creditCard.paymentUrl)) && (
                                        <p className="mt-2 text-sm text-gray-500">{t.paymentUnavailable}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                <p className="text-lg font-medium text-gray-900">{t.total}</p>
                                <p className="text-2xl font-light text-[#F5C542]">₪{selectedOrder.totalAmount.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-b-3xl">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            >
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
