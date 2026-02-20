
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";

// ═══════════════════════════════════════════════════════
// 📋  Multi-Step Lead / Onboarding Form
// ═══════════════════════════════════════════════════════

type FormData = {
    name: string;
    email: string;
    phone: string;
    message: string;
    // Step 2 – onboarding
    productInterest: string;
    // Step 3 – preferences
    contactMethod: string;
    contactTime: string;
};

const STEPS = ["Contact Info", "Product Interest", "Preferences"];

export default function LeadForm() {
    const [step, setStep] = useState(0);
    const { register, handleSubmit, reset, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
        defaultValues: { productInterest: "", contactMethod: "", contactTime: "" },
    });

    // ─── Step navigation ───
    const nextStep = async () => {
        let valid = false;
        if (step === 0) valid = await trigger(["name", "phone", "email"]);
        if (step === 1) valid = await trigger(["productInterest"]);
        if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const prevStep = () => setStep((s) => Math.max(s - 1, 0));

    // ─── Submit ───
    const onSubmit = async (data: FormData) => {
        try {
            const payload = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                message: data.message || "",
                source: "website",
                onboarding: {
                    productInterest: data.productInterest,
                    contactMethod: data.contactMethod,
                    contactTime: data.contactTime,
                },
            };
            await axios.post("/api/leads", payload);
            toast.success("Thank you! We'll be in touch soon.");
            reset();
            setStep(0);
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <Toaster position="top-right" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800 text-center">Get a Quote</h2>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
                {STEPS.map((label, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold
                            ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {i + 1}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`w-8 h-0.5 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        )}
                    </div>
                ))}
            </div>
            <p className="text-sm text-center text-gray-500 mb-4">{STEPS[step]}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* ══════ Step 1: Contact Info ══════ */}
                {step === 0 && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                {...register("name", { required: "Name is required" })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                {...register("phone", { required: "Phone is required" })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="+1 234 567 890"
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                {...register("message")}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                rows={3}
                                placeholder="Tell us about your project..."
                            />
                        </div>
                    </>
                )}

                {/* ══════ Step 2: Product Interest ══════ */}
                {step === 1 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">What are you interested in?</label>
                        <select
                            {...register("productInterest", { required: "Please select an option" })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="">Select…</option>
                            <option value="jewelry">Custom Jewelry</option>
                            <option value="resin_art">Resin Art</option>
                            <option value="gift_set">Gift Sets</option>
                            <option value="wholesale">Wholesale</option>
                            <option value="other">Other</option>
                        </select>
                        {errors.productInterest && <p className="text-red-500 text-xs mt-1">{errors.productInterest.message}</p>}
                    </div>
                )}

                {/* ══════ Step 3: Preferences ══════ */}
                {step === 2 && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                            <select
                                {...register("contactMethod")}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">No preference</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone Call</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Best Time to Contact</label>
                            <select
                                {...register("contactTime")}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                <option value="">Any time</option>
                                <option value="morning">Morning (9–12)</option>
                                <option value="afternoon">Afternoon (12–17)</option>
                                <option value="evening">Evening (17–21)</option>
                            </select>
                        </div>
                    </>
                )}

                {/* ══════ Navigation Buttons ══════ */}
                <div className="flex gap-3">
                    {step > 0 && (
                        <button type="button" onClick={prevStep} className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                            Back
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={nextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Next
                        </button>
                    ) : (
                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? "Sending..." : "Submit Inquiry"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
