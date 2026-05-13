"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { toneClass, type Tone } from "@/lib/status";

export interface BadgeProps {
    tone?: Tone;
    size?: "sm" | "md";
    className?: string;
    children: ReactNode;
}

export function Badge({ tone = "neutral", size = "sm", className, children }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center font-medium rounded-full",
                size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
                toneClass(tone),
                className,
            )}
        >
            {children}
        </span>
    );
}
