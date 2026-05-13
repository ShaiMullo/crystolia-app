"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
    iconStart?: ReactNode;
    iconEnd?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { className, invalid, iconStart, iconEnd, ...rest },
    ref,
) {
    const base = cn(
        "block w-full h-10 rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-400",
        "px-3 py-2",
        "transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-0",
        invalid
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-gray-300 focus:border-yellow-500 focus:ring-yellow-200",
        "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
        "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500",
        iconStart && "ps-9",
        iconEnd && "pe-9",
        className,
    );

    if (!iconStart && !iconEnd) {
        return <input ref={ref} className={base} {...rest} />;
    }

    return (
        <div className="relative">
            {iconStart && (
                <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                    {iconStart}
                </span>
            )}
            <input ref={ref} className={base} {...rest} />
            {iconEnd && (
                <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400">
                    {iconEnd}
                </span>
            )}
        </div>
    );
});
