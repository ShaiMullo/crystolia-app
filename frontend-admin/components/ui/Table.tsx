"use client";

import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function TableContainer({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800", className)}>
            {children}
        </div>
    );
}

export function Table({ children, className, ...rest }: HTMLAttributes<HTMLTableElement>) {
    return (
        <table className={cn("min-w-full text-sm", className)} {...rest}>
            {children}
        </table>
    );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <thead className={cn("bg-gray-50 dark:bg-gray-900/40", className)}>
            {children}
        </thead>
    );
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <tbody className={cn("divide-y divide-gray-100 dark:divide-gray-800", className)}>
            {children}
        </tbody>
    );
}

export function TR({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr className={cn("transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-900/40", className)} {...rest}>
            {children}
        </tr>
    );
}

export interface THProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> {
    align?: "start" | "center" | "end";
}

export function TH({ children, align = "start", className, ...rest }: THProps) {
    return (
        <th
            scope="col"
            className={cn(
                "px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400",
                align === "start" && "text-start",
                align === "center" && "text-center",
                align === "end" && "text-end",
                className,
            )}
            {...rest}
        >
            {children}
        </th>
    );
}

export interface TDProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
    align?: "start" | "center" | "end";
    muted?: boolean;
}

export function TD({ children, align = "start", muted, className, ...rest }: TDProps) {
    return (
        <td
            className={cn(
                "px-4 py-3 text-sm",
                muted ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100",
                align === "start" && "text-start",
                align === "center" && "text-center",
                align === "end" && "text-end",
                className,
            )}
            {...rest}
        >
            {children}
        </td>
    );
}

// Skeleton row used while data is loading.
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TR key={i}>
                    {Array.from({ length: columns }).map((__, j) => (
                        <TD key={j}>
                            <span className="block h-3 w-3/4 rounded skeleton" />
                        </TD>
                    ))}
                </TR>
            ))}
        </>
    );
}
