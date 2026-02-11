"use client";

import { useState } from "react";

import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setError(null);

        try {
            await login({ email, password });
            setStatus("success"); // Add valid state update
            // Redirect handled by AuthContext
        } catch (err: unknown) {
            console.error(err);
            setStatus("error");
            // Safe error extraction
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || "Login failed";
            setError(message);
        }
        // No finally block resetting to idle - let it stay success/error for UI feedback
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#F5C542] items-center justify-center relative overflow-hidden">
                <div className="z-10 text-center text-white p-12">
                    <h1 className="text-4xl font-bold mb-4">Crystolia Admin</h1>
                    <p className="text-xl opacity-90">Internal Management Portal</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Admin Login</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F5C542] focus:border-transparent outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F5C542] focus:border-transparent outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full py-3 bg-[#F5C542] text-white rounded-lg font-semibold hover:bg-[#d4a83a] transition-colors disabled:opacity-50"
                        >
                            {status === "loading" ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
