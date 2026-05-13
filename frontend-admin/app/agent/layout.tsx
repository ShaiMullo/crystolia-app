"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout, isLoading } = useAuth();
    const { t } = useAdminI18n();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.push("/login");
        } else if (user.role !== "agent" && user.role !== "admin") {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) return null;

    const initials = (user.name || user.email).slice(0, 1).toUpperCase();

    return (
        <div className="admin-shell flex flex-col">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur dark:border-gray-800 dark:bg-gray-950/85">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link href="/agent" className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-sm font-bold">C</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                            {t("nav.brand")}
                            <span className="ms-1 text-xs font-medium text-blue-600">{t("nav.brandAgentSuffix")}</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 ps-1 pe-3 py-1">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                                {initials}
                            </span>
                            <span className="hidden sm:inline text-xs text-gray-700 dark:text-gray-200 truncate max-w-[8rem]">
                                {user.name || user.email}
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
            </header>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                {children}
            </main>
        </div>
    );
}
