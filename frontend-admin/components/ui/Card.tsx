"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    padded?: boolean;
    interactive?: boolean;
}

export function Card({ padded = true, interactive, className, children, ...rest }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-gray-200 bg-white shadow-sm",
                "dark:border-gray-800 dark:bg-gray-900",
                padded && "p-5",
                interactive && "transition-colors hover:border-gray-300 dark:hover:border-gray-700",
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return <h3 className={cn("text-base font-semibold text-gray-900 dark:text-gray-50", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)}>{children}</p>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800", className)}>{children}</div>;
}
