"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">{title}</h1>
                {description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
