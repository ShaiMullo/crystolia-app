"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from 'next/link';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout, token } = useAuth();
    const router = useRouter();

    // 🔒 Authorization Guard (Strict Admin)
    useEffect(() => {
        if (!token) {
            router.push('/login');
        } else if (user && user.role !== 'admin') {
            // Agents cannot be here
            router.push('/login'); // or 403 page
        }
    }, [user, token, router]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* ADMIN Top Navigation */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-gray-900">Crystolia <span className="text-yellow-600">Admin</span></span>
                            </div>
                            <nav className="flex space-x-4">
                                <Link href="/admin" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                                    Dashboard
                                </Link>
                                {/* Future Admin Links */}
                                <span className="text-gray-400 px-3 py-2 text-sm">Settings</span>
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                {user.firstName || 'Administrator'}
                            </span>
                            <button
                                onClick={logout}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                Logout
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
