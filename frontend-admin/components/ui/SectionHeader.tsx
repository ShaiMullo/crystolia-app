"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
    return (
        <div className={cn("flex items-end justify-between gap-3", className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}
