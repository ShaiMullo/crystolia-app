import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// Demo-only payment surface (no real provider is connected). Server-side
// gate for the client page below: never indexed, and the whole route 404s
// once the operator sets DEMO_PAYMENT_PAGES_DISABLED=true — see
// docs/PRODUCTION_READINESS.md ("Manual production steps").
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function PayDemoLayout({ children }: { children: ReactNode }) {
    if (process.env.DEMO_PAYMENT_PAGES_DISABLED === "true") notFound();
    return children;
}
