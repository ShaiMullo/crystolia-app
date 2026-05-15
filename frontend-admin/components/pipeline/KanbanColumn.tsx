"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { LeadCard } from "./LeadCard";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Lead, LeadStatus } from "@/types";
import { leadStatusTone } from "@/lib/status";

interface KanbanColumnProps {
    status: LeadStatus;
    leads: Lead[];
    agentMap: Map<string, string>;
    activeId: string | null;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDrop: (status: LeadStatus) => void;
}

const toneBorder: Record<string, string> = {
    info: "border-blue-200 dark:border-blue-900/40",
    warning: "border-amber-200 dark:border-amber-900/40",
    success: "border-emerald-200 dark:border-emerald-900/40",
    danger: "border-red-200 dark:border-red-900/40",
    indigo: "border-indigo-200 dark:border-indigo-900/40",
    purple: "border-purple-200 dark:border-purple-900/40",
    teal: "border-teal-200 dark:border-teal-900/40",
    emerald: "border-emerald-200 dark:border-emerald-900/40",
    neutral: "border-gray-200 dark:border-gray-800",
};

export function KanbanColumn({ status, leads, agentMap, activeId, onDragStart, onDragEnd, onDrop }: KanbanColumnProps) {
    const { t } = useAdminI18n();
    const [over, setOver] = useState(false);
    const tone = leadStatusTone[status];

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (!over) setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                onDrop(status);
            }}
            className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border bg-gray-50/60 dark:bg-gray-900/40",
                toneBorder[tone] || toneBorder.neutral,
                over && "ring-2 ring-yellow-400 ring-offset-1 dark:ring-offset-gray-950",
            )}
        >
            <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {t(`status.${status}`)}
                </h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold tabular text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700">
                    {leads.length}
                </span>
            </header>
            <div className="flex-1 min-h-[12rem] space-y-2 overflow-y-auto p-2">
                {leads.length === 0 ? (
                    <p className="py-8 text-center text-xs text-gray-400">{t("pipeline.column.empty")}</p>
                ) : (
                    leads.map((lead) => (
                        <LeadCard
                            key={lead._id}
                            lead={lead}
                            agentName={lead.assignedTo ? agentMap.get(lead.assignedTo) : undefined}
                            dragging={activeId === lead._id}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
