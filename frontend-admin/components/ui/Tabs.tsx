"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string = string> {
    id: T;
    label: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
}

export interface TabsProps<T extends string = string> {
    items: TabItem<T>[];
    value: T;
    onChange: (id: T) => void;
    className?: string;
}

export function Tabs<T extends string = string>({ items, value, onChange, className }: TabsProps<T>) {
    return (
        <div className={cn("border-b border-gray-200 dark:border-gray-800", className)} role="tablist">
            <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1 overflow-x-auto">
                {items.map((item) => {
                    const active = item.id === value;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(item.id)}
                            className={cn(
                                "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors focus:outline-none",
                                active
                                    ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200",
                            )}
                        >
                            {item.icon && <span className={cn("text-gray-400", active && "text-yellow-600")}>{item.icon}</span>}
                            {item.label}
                            {item.badge && (
                                <span className={cn(
                                    "rounded-full px-2 py-0.5 text-xs",
                                    active ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
