"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import type { Locale } from "../i18n/config";
import { whatsappNumber } from "../i18n/site";

interface ContactProps {
  locale: Locale;
  dict: {
    contact: {
      title: string;
      subtitle: string;
      form: {
        name: string;
        namePlaceholder: string;
        phone: string;
        phonePlaceholder: string;
        message: string;
        messagePlaceholder: string;
        submit: string;
        sending: string;
        success: string;
        error: string;
        errors: {
          name: string;
          phone: string;
          phoneInvalid: string;
        };
      };
      whatsapp: string;
      whatsappIntro: string;
    };
  };
}

// The CRM lead API. All three landing domains post cross-origin to the same
// backend. Resolution is environment-safe (inlined at build time):
//   - explicit NEXT_PUBLIC_LEADS_API_URL always wins (preview/test builds);
//   - `next dev` defaults to the local backend so a developer can never
//     silently submit test leads to the production CRM;
//   - production builds default to the real API.
const API_URL =
  process.env.NEXT_PUBLIC_LEADS_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://api.crystolia.com");

// Lenient phone check: accepts international formats (+, spaces, dashes,
// parentheses) and only requires 7–15 digits — never blocks a legitimate
// number, only obvious non-numbers. Numbers copy-pasted from chat apps or
// RTL pages carry invisible Unicode format marks (LRM/RLM, bidi isolates,
// zero-width chars) that neither trim() nor \s matches — strip them before
// judging the visible characters, or real numbers get rejected.
function isPlausiblePhone(raw: string): boolean {
  const visible = raw
    .replace(/[\u200B-\u200F\u2060\u2066-\u2069\u202A-\u202E\uFEFF]/g, "")
    .trim();
  const digits = visible.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[+0-9()\-.\s]+$/.test(visible);
}

// UTM parameters from the current URL, when present (paid/campaign traffic).
function collectUtm(): Record<string, string> | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    let utm: Record<string, string> | undefined;
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const value = params.get(key);
      if (value) (utm ??= {})[key] = value.slice(0, 200);
    }
    return utm;
  } catch {
    return undefined;
  }
}

export default function Contact({ locale, dict }: ContactProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const errorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  // Honeypot: humans never see or fill this; bots that do are silently dropped.
  const [honeypot, setHoneypot] = useState("");
  // Synchronous double-submit guard. React state ("sending") only updates on
  // re-render, so N clicks in the same tick would all see stale "idle" state
  // and fire N concurrent requests — a ref blocks re-entry immediately.
  const submittingRef = useRef(false);
  // Idempotency key: one per real submit attempt. Kept across failed retries
  // of the SAME data (the server replays instead of duplicating), cleared on
  // confirmed success — and on any field edit, so changed data is a new
  // attempt and can never be swallowed by a replay of the old one.
  const submissionIdRef = useRef<string | null>(null);
  const updateField = (patch: Partial<typeof formData>) => {
    submissionIdRef.current = null;
    setFormData((prev) => ({ ...prev, ...patch }));
  };
  const [fieldErrors, setFieldErrors] = useState<{ name: boolean; phone: "required" | "invalid" | false }>({
    name: false,
    phone: false,
  });
  const isRTL = locale === "he";

  // On a submit error, move focus to the alert so keyboard and screen-reader
  // users are taken straight to it (role="alert" also announces it).
  useEffect(() => {
    if (status === "error") {
      errorRef.current?.focus();
    }
  }, [status]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return; // double-submit guard (synchronous)

    // Field-level validation: name + phone are required (whitespace-only is
    // rejected via trim); phone must also look like a real number. On failure,
    // show inline errors and move focus to the first invalid field.
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const nameInvalid = name === "";
    const phoneInvalid: "required" | "invalid" | false =
      phone === "" ? "required" : !isPlausiblePhone(phone) ? "invalid" : false;
    if (nameInvalid || phoneInvalid) {
      setFieldErrors({ name: nameInvalid, phone: phoneInvalid });
      if (nameInvalid) {
        nameRef.current?.focus();
      } else {
        phoneRef.current?.focus();
      }
      return;
    }
    setFieldErrors({ name: false, phone: false });

    submittingRef.current = true;
    setStatus("sending");

    if (!submissionIdRef.current) {
      submissionIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          message: formData.message.trim(),
          locale,
          // The server derives the domain from the validated Origin header;
          // only the relative page path is sent from here.
          sourcePage: window.location.pathname,
          utm: collectUtm(),
          submissionId: submissionIdRef.current,
          website: honeypot, // honeypot — empty for humans
        }),
      });

      // Success only once the server confirms the lead was accepted — a 2xx
      // from anything else (e.g. a CDN error page) is not a confirmation.
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success === true) {
        submissionIdRef.current = null; // next submission is a new attempt
        setStatus("success");
        setFormData({ name: "", phone: "", message: "" });
        setTimeout(() => setStatus("idle"), 6000);
      } else {
        // Keep the entered data so the visitor can retry.
        setStatus("error");
        setTimeout(() => setStatus("idle"), 6000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 6000);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleWhatsApp = () => {
    const phone = whatsappNumber(locale);
    const lines = [dict.contact.whatsappIntro, ""];
    if (formData.name) lines.push(`${dict.contact.form.name}: ${formData.name}`);
    if (formData.phone) lines.push(`${dict.contact.form.phone}: ${formData.phone}`);
    if (formData.message) lines.push(`${dict.contact.form.message}: ${formData.message}`);
    const message = encodeURIComponent(lines.join("\n"));
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
        dir={isRTL ? "rtl" : "ltr"}
        className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12"
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
          <form onSubmit={handleSubmit} noValidate aria-busy={status === "sending"} className="space-y-6">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-light text-gray-700 mb-2"
              >
                {dict.contact.form.name}
              </label>
              <input
                ref={nameRef}
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => {
                  updateField({ name: e.target.value });
                  if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: false }));
                }}
                required
                aria-invalid={fieldErrors.name ? "true" : "false"}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                disabled={status === "sending"}
                placeholder={dict.contact.form.namePlaceholder}
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light disabled:opacity-50"
              />
              {fieldErrors.name && (
                <p id="name-error" role="alert" className="mt-2 text-sm text-red-700">
                  {dict.contact.form.errors.name}
                </p>
              )}
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
                ref={phoneRef}
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  updateField({ phone: e.target.value });
                  if (fieldErrors.phone) setFieldErrors((f) => ({ ...f, phone: false }));
                }}
                required
                aria-invalid={fieldErrors.phone ? "true" : "false"}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                disabled={status === "sending"}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder={dict.contact.form.phonePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light disabled:opacity-50"
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="mt-2 text-sm text-red-700">
                  {fieldErrors.phone === "invalid"
                    ? dict.contact.form.errors.phoneInvalid
                    : dict.contact.form.errors.phone}
                </p>
              )}
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
                  updateField({ message: e.target.value })
                }
                rows={5}
                disabled={status === "sending"}
                placeholder={dict.contact.form.messagePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#F5C542] focus:ring-2 focus:ring-[#F5C542]/20 outline-none transition-all duration-300 font-light resize-none disabled:opacity-50"
              />
            </div>

            {/* Honeypot — visually hidden and skipped by keyboard/AT; only bots
                fill it. Positioned off-screen rather than display:none because
                naive bots skip invisible fields. */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
            >
              <label htmlFor="website-field">Leave this field empty</label>
              <input
                type="text"
                id="website-field"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Status Messages — announced to assistive technology */}
            {status === "success" && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-light"
              >
                {dict.contact.form.success}
              </div>
            )}
            {status === "error" && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-light"
              >
                {dict.contact.form.error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full px-8 py-4 bg-[#F5C542] text-[#3D2914] rounded-full font-light text-base tracking-wide hover:bg-[#F5C542]/90 transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? dict.contact.form.sending : dict.contact.form.submit}
            </button>
          </form>

          {/* WhatsApp Fallback */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleWhatsApp}
              className="w-full px-8 py-4 bg-[#25D366] text-[#3D2914] rounded-full font-light text-base tracking-wide hover:bg-[#25D366]/90 transition-all duration-300 hover:scale-[1.02] active:scale-98 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
