"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    iconStart?: ReactNode;
    iconEnd?: ReactNode;
    fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
    primary:
        "bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500 disabled:bg-yellow-300",
    secondary:
        "bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white",
    outline:
        "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-300 dark:bg-transparent dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800",
    ghost:
        "bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300 dark:text-gray-200 dark:hover:bg-gray-800",
    danger:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    success:
        "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
};

const sizeClass: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
    md: "h-10 px-4 text-sm gap-2 rounded-md",
    lg: "h-11 px-5 text-sm gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = "primary",
        size = "md",
        loading = false,
        iconStart,
        iconEnd,
        fullWidth,
        className,
        children,
        disabled,
        type,
        ...rest
    },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type ?? "button"}
            disabled={disabled || loading}
            className={cn(
                "inline-flex items-center justify-center font-medium",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "dark:focus-visible:ring-offset-gray-950",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                variantClass[variant],
                sizeClass[size],
                fullWidth && "w-full",
                className,
            )}
            {...rest}
        >
            {loading ? (
                <span className="inline-block h-3.5 w-3.5 border-2 border-current border-r-transparent rounded-full animate-spin" />
            ) : (
                iconStart && <span className="inline-flex shrink-0">{iconStart}</span>
            )}
            {children}
            {iconEnd && !loading && <span className="inline-flex shrink-0">{iconEnd}</span>}
        </button>
    );
});
