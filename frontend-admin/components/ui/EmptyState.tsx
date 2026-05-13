"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
            {icon && (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {icon}
                </div>
            )}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
