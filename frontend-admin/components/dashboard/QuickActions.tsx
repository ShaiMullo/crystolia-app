"use client";

import { FilePlus, UserPlus, Search, Wrench } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle, Button } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

export interface QuickActionsProps {
    onCreateUser: () => void;
    onCreateInvoice: () => void;
    onJumpToLeads: () => void;
}

export function QuickActions({ onCreateUser, onCreateInvoice, onJumpToLeads }: QuickActionsProps) {
    const { t } = useAdminI18n();

    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-4">
                <CardTitle>{t("dashboard.quickActions.title")}</CardTitle>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" size="md" fullWidth iconStart={<UserPlus size={16} />} onClick={onCreateUser}>
                    {t("dashboard.quickActions.createUser")}
                </Button>
                <Button variant="outline" size="md" fullWidth iconStart={<FilePlus size={16} />} onClick={onCreateInvoice}>
                    {t("dashboard.quickActions.createInvoice")}
                </Button>
                <Button variant="outline" size="md" fullWidth iconStart={<Search size={16} />} onClick={onJumpToLeads}>
                    {t("dashboard.quickActions.findLeads")}
                </Button>
                <Link href="/admin/settings" className="contents">
                    <Button variant="outline" size="md" fullWidth iconStart={<Wrench size={16} />}>
                        {t("dashboard.quickActions.settings")}
                    </Button>
                </Link>
            </div>
        </Card>
    );
}
