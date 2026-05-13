"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
    label?: ReactNode;
    htmlFor?: string;
    required?: boolean;
    hint?: ReactNode;
    error?: ReactNode;
    optional?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function Field({ label, htmlFor, required, hint, error, optional, className, children }: FieldProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            {label && (
                <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <span>{label}</span>
                    {required && <span className="text-red-500" aria-hidden="true">*</span>}
                    {optional && (
                        <span className="text-xs font-normal text-gray-400">{optional}</span>
                    )}
                </label>
            )}
            {children}
            {error ? (
                <p className="text-xs text-red-600">{error}</p>
            ) : hint ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            ) : null}
        </div>
    );
}
