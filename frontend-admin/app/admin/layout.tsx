"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Settings, LogOut, Kanban, CheckSquare, Activity } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { cn } from "@/lib/cn";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout, isLoading } = useAuth();
    const { t } = useAdminI18n();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.push("/login");
        } else if (user.role !== "admin") {
            router.push(user.role === "agent" ? "/agent" : "/login");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== "admin") return null;

    const initials = (user.name || user.email).slice(0, 1).toUpperCase();
    const navItems = [
        { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
        { href: "/admin/pipeline", label: t("nav.pipeline"), icon: Kanban },
        { href: "/admin/customers", label: t("nav.customers"), icon: Building2 },
        { href: "/admin/tasks", label: t("nav.tasks"), icon: CheckSquare },
        { href: "/admin/activity", label: t("nav.activity"), icon: Activity },
        { href: "/admin/settings", label: t("nav.settings"), icon: Settings },
    ];

    return (
        <div className="admin-shell flex flex-col">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-6 min-w-0">
                        <Link href="/admin" className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-yellow-500 text-white text-sm font-bold">C</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                                {t("nav.brand")}
                                <span className="ms-1 text-xs font-medium text-yellow-600">{t("nav.brandAdminSuffix")}</span>
                            </span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                            active
                                                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
                                        )}
                                    >
                                        <item.icon size={14} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <NotificationsBell />
                        <LanguageSwitcher />
                        <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 ps-1 pe-3 py-1">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-semibold text-white">
                                {initials}
                            </span>
                            <span className="hidden sm:inline text-xs text-gray-700 dark:text-gray-200 truncate max-w-[8rem]">
                                {user.name || t("nav.administratorFallback")}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            aria-label={t("nav.logout")}
                        >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">{t("nav.logout")}</span>
                        </button>
                    </div>
                </div>
                <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
                    {navItems.map((item) => {
                        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
                                    active
                                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                                )}
                            >
                                <item.icon size={14} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {children}
            </main>
        </div>
    );
}
