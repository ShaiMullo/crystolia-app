"use client";

import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/whatsapp";

export default function WhatsAppButton() {
  return (
    <Link
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105 hover:bg-green-400 hover:shadow-xl"
    >
      <span className="text-2xl" aria-hidden="true">
        💬
      </span>
    </Link>
  );
}

