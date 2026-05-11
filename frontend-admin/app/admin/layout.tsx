"use client";

import { useAuth } from "@/app/context/AuthContext";
import Link from 'next/link';
import { useAdminI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout } = useAuth();
    const { t } = useAdminI18n();

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* ADMIN Top Navigation */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-gray-900">{t('nav.brand')} <span className="text-yellow-600">{t('nav.brandAdminSuffix')}</span></span>
                            </div>
                            <nav className="flex space-x-4">
                                <Link href="/admin" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                                    {t('nav.dashboard')}
                                </Link>
                                <Link href="/admin" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    {t('nav.crm')}
                                </Link>
                                <Link href="/admin/settings" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    {t('nav.settings')}
                                </Link>
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            <LanguageSwitcher />
                            <span className="text-sm text-gray-500">
                                {user?.name || t('nav.administratorFallback')}
                            </span>
                            <button
                                onClick={logout}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                {t('nav.logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
