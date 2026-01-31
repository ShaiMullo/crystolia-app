import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/whatsapp";

export default function WhatsAppButton() {
  return (
    <Link
      href={WHATSAPP_URL}
      target="_blank"
      className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition"
    >
      דברו איתנו ב־WhatsApp
    </Link>
  );
}
