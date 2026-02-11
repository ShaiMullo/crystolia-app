"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, logout, token } = useAuth();
    const router = useRouter();

    // 🔒 Authorization Guard
    useEffect(() => {
        if (!token) {
            router.push('/login');
        } else if (user && user.role !== 'agent' && user.role !== 'admin') {
            // Admins can technically view Agent dashboard if they want, but stricly speaking they have their own.
            // Requirement said "Role-Based".
            // Let's enforce strict Agent-only for this route, or allow Admin to impersonate? 
            // Better to stick to strict: /agent is for Agents.
            router.push('/login');
        }
    }, [user, token, router]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* AGENT Top Navigation */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-gray-800">Crystolia <span className="text-blue-600">Agent</span></span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                {user.firstName || user.email}
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
