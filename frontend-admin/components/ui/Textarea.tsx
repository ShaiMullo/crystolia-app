"use client";

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { className, invalid, ...rest },
    ref,
) {
    return (
        <textarea
            ref={ref}
            className={cn(
                "block w-full rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-400",
                "px-3 py-2",
                "resize-y",
                "focus:outline-none focus:ring-2",
                invalid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-yellow-500 focus:ring-yellow-200",
                "disabled:bg-gray-50 disabled:text-gray-400",
                "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500",
                className,
            )}
            {...rest}
        />
    );
});
