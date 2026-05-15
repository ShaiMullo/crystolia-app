"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { CustomersTab } from "@/components/dashboard/CustomersTab";
import { useAdminI18n } from "@/i18n/I18nProvider";
import api from "@/app/lib/api";
import type { User } from "@/types";

export default function CustomersPage() {
    const { t } = useAdminI18n();
    const [refreshKey, setRefreshKey] = useState(0);
    const [agents, setAgents] = useState<User[]>([]);

    useEffect(() => {
        let cancelled = false;
        api.get("/users")
            .then((res) => {
                if (cancelled) return;
                const list: User[] = res.data?.data || [];
                setAgents(list.filter((u) => u.role === "agent" || u.role === "admin"));
            })
            .catch(() => {
                // non-fatal — filter will just be hidden
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("customers.pageTitle")}
                description={t("customers.pageSubtitle")}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        iconStart={<RefreshCw size={14} />}
                        onClick={() => setRefreshKey((k) => k + 1)}
                    >
                        {t("common.refresh")}
                    </Button>
                }
            />

            <CustomersTab key={refreshKey} agents={agents} />
        </div>
    );
}
