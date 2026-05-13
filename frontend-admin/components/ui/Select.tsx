"use client";

import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
    pill?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { className, invalid, pill, children, ...rest },
    ref,
) {
    return (
        <select
            ref={ref}
            className={cn(
                "block w-full text-sm text-gray-900",
                pill
                    ? "h-7 px-2 rounded-full border-0"
                    : "h-10 px-3 rounded-md border bg-white",
                !pill && (invalid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-yellow-500 focus:ring-yellow-200"),
                "focus:outline-none focus:ring-2",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                !pill && "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700",
                className,
            )}
            {...rest}
        >
            {children}
        </select>
    );
});
