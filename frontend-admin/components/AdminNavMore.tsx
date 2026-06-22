"use client";

// ===============================================
// 🧭 AdminNavMore — overflow ("More") menu for the admin top nav
// ===============================================
// Keeps the top navbar uncluttered on desktop: core routes stay inline, the
// rest live behind a single "More" dropdown. All routes remain reachable.
// Mirrors the dropdown idiom used by NotificationsBell (ref + click-outside +
// Escape + dir-aware positioning).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";

export interface AdminNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

function isRouteActive(pathname: string, href: string): boolean {
    return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export function AdminNavMore({ items }: { items: AdminNavItem[] }) {
    const { t, dir } = useAdminI18n();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    const anyActive = items.some((i) => isRouteActive(pathname, i.href));

    // Click-outside + Escape to close.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (items.length === 0) return null;

    return (
        <div className="relative shrink-0" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    anyActive
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
                )}
            >
                <MoreHorizontal size={14} className="shrink-0" />
                <span>{t("nav.more")}</span>
                <ChevronDown
                    size={12}
                    className={cn("shrink-0 transition-transform", open && "rotate-180")}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className={cn(
                        "absolute top-11 z-40 min-w-[12rem] rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10",
                        dir === "rtl" ? "start-0" : "end-0",
                    )}
                >
                    {items.map((item) => {
                        const active = isRouteActive(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                role="menuitem"
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                                    active
                                        ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60",
                                )}
                            >
                                <item.icon size={15} className="shrink-0" />
                                <span className="whitespace-nowrap">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default AdminNavMore;
