"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

export interface StatCardProps {
    label: ReactNode;
    value: ReactNode;
    icon?: ReactNode;
    trend?: ReactNode;
    hint?: ReactNode;
    accent?: "default" | "brand" | "success" | "warning" | "danger";
    className?: string;
}

const accentClass: Record<NonNullable<StatCardProps["accent"]>, string> = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    brand: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function StatCard({ label, value, icon, trend, hint, accent = "default", className }: StatCardProps) {
    return (
        <Card className={cn("flex items-start gap-4", className)} padded>
            {icon && (
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentClass[accent])}>
                    {icon}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tabular text-gray-900 dark:text-gray-50">{value}</p>
                    {trend && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{trend}</span>}
                </div>
                {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            </div>
        </Card>
    );
}
