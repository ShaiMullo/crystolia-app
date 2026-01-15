"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const userId = searchParams.get("userId");
        const role = searchParams.get("role") || "customer";
        const firstName = searchParams.get("firstName") || "";
        const lastName = searchParams.get("lastName") || "";
        const profilePicture = searchParams.get("profilePicture") || "";

        console.log("🔹 Auth Callback Page - Token received:", token);

        if (token && userId) {
            const user = {
                _id: userId,
                email: "",
                role,
                firstName,
                lastName,
                profilePicture: decodeURIComponent(profilePicture),
            };

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            // Redirect based on role
            if (role === "admin") {
                router.push("/he/admin");
            } else if (role === "secretary") {
                router.push("/he/secretary");
            } else {
                router.push("/he/dashboard");
            }
        } else {
            // No token, redirect to login
            console.error("No token received in callback");
            router.push("/he/auth?error=no_token");
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-[#F5C542] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">מתחבר...</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full"></div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
