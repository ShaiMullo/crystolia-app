"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    size?: ModalSize;
    children: ReactNode;
    footer?: ReactNode;
    /** Disable closing the modal with Escape / overlay click. Useful for unsaved-form prompts. */
    persistent?: boolean;
}

const sizeClass: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export function Modal({ isOpen, onClose, title, description, size = "md", children, footer, persistent }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (!persistent && e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [isOpen, onClose, persistent]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
        >
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm modal-backdrop"
                aria-hidden="true"
                onClick={persistent ? undefined : onClose}
            />
            <div
                className={cn(
                    "relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5",
                    "dark:bg-gray-900 dark:ring-white/10",
                    "modal-content max-h-[90vh] flex flex-col",
                    sizeClass[size],
                )}
            >
                {(title || description) && (
                    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="min-w-0">
                            {title && (
                                <h3 id="modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-50 truncate">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>

                {footer && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 bg-gray-50/60 dark:bg-gray-900/60">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
