"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/app/lib/api";
import { KanbanColumn } from "./KanbanColumn";
import { buildAgentMap } from "./LeadCard";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { Lead, LeadStatus, User } from "@/types";

export const PIPELINE_STATUSES: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
    "archived",
];

interface KanbanBoardProps {
    leads: Lead[];
    users: User[];
    onChange: (leads: Lead[]) => void;
}

export function KanbanBoard({ leads, users, onChange }: KanbanBoardProps) {
    const { t } = useAdminI18n();
    const [activeId, setActiveId] = useState<string | null>(null);

    const agentMap = useMemo(() => buildAgentMap(users), [users]);

    const grouped = useMemo(() => {
        const out: Record<LeadStatus, Lead[]> = {
            new: [], contacted: [], qualified: [], proposal: [], won: [], lost: [], converted: [], closed: [], archived: [], "re-engaged": [],
        };
        for (const lead of leads) {
            if (out[lead.status]) out[lead.status].push(lead);
        }
        return out;
    }, [leads]);

    const handleDragStart = useCallback((id: string) => {
        setActiveId(id);
    }, []);

    const handleDragEnd = useCallback(() => {
        setActiveId(null);
    }, []);

    const handleDrop = useCallback(
        async (status: LeadStatus) => {
            if (!activeId) return;
            const draggedId = activeId;
            setActiveId(null);

            const current = leads.find((l) => l._id === draggedId);
            if (!current || current.status === status) return;
            const previousStatus = current.status;

            // Optimistic update.
            const optimistic = leads.map((l) => (l._id === draggedId ? { ...l, status } : l));
            onChange(optimistic);

            try {
                await api.patch(`/leads/${draggedId}`, { status });
                toast.success(t("pipeline.toasts.moved", { status: t(`status.${status}`) }));
            } catch (err: unknown) {
                console.error(err);
                toast.error(t("pipeline.toasts.moveFailed"));
                // Roll back.
                const rolledBack = leads.map((l) => (l._id === draggedId ? { ...l, status: previousStatus } : l));
                onChange(rolledBack);
            }
        },
        [activeId, leads, onChange, t],
    );

    return (
        <div className="-mx-4 sm:mx-0">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
                {PIPELINE_STATUSES.map((status) => (
                    <div key={status} className="snap-start">
                        <KanbanColumn
                            status={status}
                            leads={grouped[status] || []}
                            agentMap={agentMap}
                            activeId={activeId}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
