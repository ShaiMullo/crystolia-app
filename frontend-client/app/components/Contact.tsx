"use client";

import { useState, FormEvent } from "react";
import type { Locale } from "../../i18n/config";

interface ContactProps {
  locale: Locale;
  dict: {
    contact: {
      title: string;
      subtitle: string;
      form: {
        name: string;
        phone: string;
        message: string;
        submit: string;
        sending: string;
        success: string;
        error: string;
      };
      whatsapp: string;
    };
  };
}

export default function Contact({ locale, dict }: ContactProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const isRTL = locale === "he";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const apiUrl = (typeof window !== 'undefined' && (window as any).__ENV?.API_URL) || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", phone: "", message: "" });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleWhatsApp = () => {
    const phone = "972501234567"; // Replace with actual WhatsApp number
    const message = encodeURIComponent(
      `${dict.contact.whatsapp}\n\n${dict.contact.form.name}: ${formData.name}\n${dict.contact.form.phone}: ${formData.phone}\n${dict.contact.form.message}: ${formData.message}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <section
      id="contact"
      className="relative py-32 bg-white overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5C542] rounded-full blur-3xl" />
      </div>

      <div
        className={`relative z-10 max-w-4xl mx-auto px-6 lg:px-12 ${isRTL ? "rtl" : "ltr"
          }`}
      >
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-extralight tracking-tight text-gray-900 mb-4">
            {dict.contact.title}
          </h2>
          <p className="text-xl font-light text-gray-600">
            {dict.contact.subtitle}
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-light text-gray-700 mb-2"
              >
                {dict.contact.form.name}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-light text-gray-700 mb-2"
              >
                {dict.contact.form.phone}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light"
              />
            </div>

            {/* Message Field */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-light text-gray-700 mb-2"
              >
                {dict.contact.form.message}
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light resize-none"
              />
            </div>

            {/* Status Message */}
            {status === "success" && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-light">
                {dict.contact.form.success}
              </div>
            )}
            {status === "error" && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-light">
                {dict.contact.form.error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full px-8 py-4 bg-[#F5C542] text-white rounded-full font-light text-base tracking-wide hover:bg-[#F5C542]/90 transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending"
                ? dict.contact.form.sending
                : dict.contact.form.submit}
            </button>
          </form>

          {/* WhatsApp Shortcut */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleWhatsApp}
              className="w-full px-8 py-4 bg-[#25D366] text-white rounded-full font-light text-base tracking-wide hover:bg-[#25D366]/90 transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              {dict.contact.whatsapp}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
