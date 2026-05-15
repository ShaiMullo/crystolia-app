"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox, Bot } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/crmApi";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { NotificationRecord } from "@/types";
import { cn } from "@/lib/cn";

const POLL_MS = 60_000;

export function NotificationsBell() {
    const { t, locale, dir } = useAdminI18n();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<NotificationRecord[]>([]);
    const [unread, setUnread] = useState(0);
    const panelRef = useRef<HTMLDivElement | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await listNotifications(false, 20);
            setItems(res.data || []);
            setUnread(res.unreadCount || 0);
        } catch {
            // Silent — bell never blocks UI on failure.
        }
    }, []);

    // Initial load + polling. The initial fetch is deferred to the next tick
    // so React doesn't see a state update during the effect itself.
    useEffect(() => {
        const t0 = setTimeout(() => { void refresh(); }, 0);
        const id = setInterval(refresh, POLL_MS);
        return () => {
            clearTimeout(t0);
            clearInterval(id);
        };
    }, [refresh]);

    // Click-outside to close
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
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

    const handleOpen = async () => {
        if (!open) {
            setLoading(true);
            await refresh();
            setLoading(false);
        }
        setOpen((v) => !v);
    };

    const handleItemClick = async (id: string) => {
        const target = items.find((n) => n._id === id);
        if (!target) return;
        if (!target.isRead) {
            // optimistic
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
            setUnread((u) => Math.max(0, u - 1));
            try {
                await markNotificationRead(id);
            } catch {
                // best effort; revert if needed
                refresh();
            }
        }
        if (target.link) {
            setOpen(false);
            router.push(target.link);
        }
    };

    const handleReadAll = async () => {
        const had = unread;
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        try {
            await markAllNotificationsRead();
        } catch {
            // restore
            setUnread(had);
            refresh();
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={handleOpen}
                aria-label={t("notifications.title")}
                aria-expanded={open}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute top-1 end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label={t("notifications.title")}
                    className={cn(
                        "absolute top-11 z-40 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:border-gray-800 dark:ring-white/10",
                        dir === "rtl" ? "start-0" : "end-0",
                    )}
                >
                    <header className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                            {t("notifications.title")}
                        </h3>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={handleReadAll}
                                className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:underline"
                            >
                                <CheckCheck size={12} /> {t("notifications.markAll")}
                            </button>
                        )}
                    </header>
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                <Inbox size={20} />
                                <span>{t("notifications.empty")}</span>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {items.map((n) => (
                                    <li key={n._id}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(n._id)}
                                            className={cn(
                                                "block w-full text-start px-4 py-3 transition-colors",
                                                "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                                                !n.isRead && "bg-yellow-50/40 dark:bg-yellow-900/10",
                                            )}
                                        >
                                            <div className="flex items-start gap-2">
                                                {!n.isRead && <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" aria-hidden />}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{n.title}</p>
                                                    {n.body && (
                                                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p>
                                                    )}
                                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                                                        <span>{formatDateTime(n.createdAt, locale as Locale)}</span>
                                                        {n.sourceAutomation && (
                                                            <>
                                                                <span>·</span>
                                                                <span className="inline-flex items-center gap-0.5"><Bot size={10} /> {t("notifications.automation")}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <footer className="border-t border-gray-100 dark:border-gray-800 px-4 py-2">
                        <Link href="/admin/activity" className="text-xs text-yellow-700 hover:underline">
                            {t("notifications.openActivity")}
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}
