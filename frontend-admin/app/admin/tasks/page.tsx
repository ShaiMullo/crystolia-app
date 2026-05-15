"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, RefreshCw } from "lucide-react";
import api from "@/app/lib/api";
import { Button, PageHeader, Tabs, type TabItem } from "@/components/ui";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskModal, type CreateTaskPayload } from "@/components/tasks/CreateTaskModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { createTask } from "@/lib/crmApi";
import type { User } from "@/types";

type TasksTabId = "mine" | "overdue" | "team" | "done";

export default function TasksPage() {
    const { t } = useAdminI18n();
    const [tab, setTab] = useState<TasksTabId>("mine");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [agents, setAgents] = useState<User[]>([]);

    const tabs: TabItem<TasksTabId>[] = [
        { id: "mine", label: t("tasks.tabs.mine") },
        { id: "overdue", label: t("tasks.tabs.overdue") },
        { id: "team", label: t("tasks.tabs.team") },
        { id: "done", label: t("tasks.tabs.done") },
    ];

    const params = (() => {
        if (tab === "mine") return { assignedTo: "me", status: "open" as const };
        if (tab === "overdue") return { assignedTo: "me", overdue: true };
        if (tab === "team") return { status: "open" as const };
        return { status: "done" as const };
    })();

    useEffect(() => {
        let cancelled = false;
        api.get("/users")
            .then((res) => {
                if (cancelled) return;
                const list: User[] = res.data?.data || [];
                setAgents(list.filter((u) => u.role === "agent" || u.role === "admin"));
            })
            .catch(() => {
                // non-fatal
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleCreate = useCallback(
        async (payload: CreateTaskPayload) => {
            try {
                await createTask(payload);
                toast.success(t("tasks.toasts.created"));
                setRefreshKey((k) => k + 1);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { error?: string; message?: string } } };
                toast.error(e.response?.data?.error || e.response?.data?.message || t("tasks.toasts.createFailed"));
                throw err;
            }
        },
        [t],
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("tasks.pageTitle")}
                description={t("tasks.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={() => setRefreshKey((k) => k + 1)}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setIsCreateOpen(true)}>
                            {t("tasks.create.title")}
                        </Button>
                    </>
                }
            />

            <Tabs<TasksTabId> items={tabs} value={tab} onChange={setTab} />

            <div className="pt-2">
                <TaskList key={`${tab}-${refreshKey}`} params={params} limit={50} />
            </div>

            <CreateTaskModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                agents={agents}
                onSubmit={handleCreate}
            />
        </div>
    );
}
