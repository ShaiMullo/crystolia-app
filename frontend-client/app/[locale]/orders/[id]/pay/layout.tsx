import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { demoPaymentPagesDisabled } from "@/app/lib/demoPages";

// Demo-only payment surface (no real provider is connected). Server-side
// gate for the client page below: never indexed, and the whole route 404s
// in production unless explicitly re-enabled — see app/lib/demoPages.ts and
// docs/PRODUCTION_READINESS.md ("Manual production steps").
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function PayDemoLayout({ children }: { children: ReactNode }) {
    if (demoPaymentPagesDisabled()) notFound();
    return children;
}
