"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "@/app/lib/api";
import { Button, LoadingState, PageHeader } from "@/components/ui";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PipelineKpis } from "@/components/pipeline/PipelineKpis";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { getPipelineAnalytics } from "@/lib/crmApi";
import type { Lead, PipelineAnalytics, User } from "@/types";

export default function PipelinePage() {
    const { t } = useAdminI18n();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch a generous page of leads so the board feels populated.
            // Production-scale optimization (per-column lazy load) is Phase 5.
            const [leadsRes, usersRes, analyticsData] = await Promise.all([
                api.get("/leads?page=1&limit=200"),
                api.get("/v1/users"),
                getPipelineAnalytics().catch(() => null),
            ]);
            setLeads(leadsRes.data?.data?.leads || []);
            setUsers(usersRes.data?.data || []);
            setAnalytics(analyticsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("pipeline.pageTitle")}
                description={t("pipeline.pageSubtitle")}
                actions={
                    <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchAll}>
                        {t("common.refresh")}
                    </Button>
                }
            />

            <PipelineKpis analytics={analytics} />

            {loading ? (
                <LoadingState label={t("pipeline.loading")} />
            ) : (
                <KanbanBoard leads={leads} users={users} onChange={setLeads} />
            )}
        </div>
    );
}
