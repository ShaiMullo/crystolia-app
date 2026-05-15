"use client";

import { memo } from "react";
import Link from "next/link";
import { GripVertical, Phone, Tag } from "lucide-react";
import { Badge } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Lead, User } from "@/types";

interface LeadCardProps {
    lead: Lead;
    agentName?: string;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    dragging?: boolean;
}

function LeadCardImpl({ lead, agentName, onDragStart, onDragEnd, dragging }: LeadCardProps) {
    const { t, locale } = useAdminI18n();
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", lead._id);
                onDragStart(lead._id);
            }}
            onDragEnd={onDragEnd}
            className={[
                "group rounded-lg border bg-white px-3 py-2.5 shadow-sm",
                "dark:bg-gray-900 dark:border-gray-800",
                "cursor-grab active:cursor-grabbing",
                "transition-colors hover:border-gray-300 dark:hover:border-gray-700",
                dragging ? "opacity-50" : "",
            ].join(" ")}
        >
            <div className="flex items-start gap-2">
                <GripVertical
                    size={14}
                    className="mt-0.5 shrink-0 text-gray-300 group-hover:text-gray-400 dark:text-gray-700"
                    aria-hidden
                />
                <div className="min-w-0 flex-1">
                    <Link
                        href={`/admin/leads/${lead._id}`}
                        className="block text-sm font-medium text-gray-900 dark:text-gray-50 hover:underline truncate"
                    >
                        {lead.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Phone size={12} aria-hidden />
                        <span className="truncate">{lead.phone}</span>
                    </div>
                    {agentName && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {t("pipeline.card.agent")}: <span className="text-gray-700 dark:text-gray-200">{agentName}</span>
                        </div>
                    )}
                    {lead.tags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {lead.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} tone="info" size="sm">
                                    <Tag size={10} className="me-0.5" aria-hidden />
                                    {tag}
                                </Badge>
                            ))}
                            {lead.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{lead.tags.length - 3}</span>
                            )}
                        </div>
                    )}
                    <div className="mt-1.5 text-xs text-gray-400">
                        {t("pipeline.card.lastActivity")}: {formatDate(lead.lastContactAt || lead.createdAt, locale as Locale)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const LeadCard = memo(LeadCardImpl);

export function buildAgentMap(users: User[]) {
    const map = new Map<string, string>();
    for (const u of users) map.set(u._id, u.name || u.email);
    return map;
}
