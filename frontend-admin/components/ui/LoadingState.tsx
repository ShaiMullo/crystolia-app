"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn("inline-block border-2 border-current border-r-transparent rounded-full animate-spin", className)}
            style={{ width: size, height: size }}
        />
    );
}

export function LoadingState({
    label = "Loading…",
    className,
}: {
    label?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn("flex items-center justify-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400", className)}
        >
            <Spinner />
            <span>{label}</span>
        </div>
    );
}

export function SkeletonLine({ className }: { className?: string }) {
    return <span className={cn("block h-3 w-full rounded skeleton", className)} />;
}
