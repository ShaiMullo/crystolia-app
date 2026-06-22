"use client";

// ===============================================
// 🟦 Admin · Integrations · Comax  (PREVIEW / MOCK)
// ===============================================
// Disabled preview screen. No API calls, no sync execution, no DB writes.
// All data comes from lib/comaxMock.ts. Every action is disabled. The page is
// clearly marked "Not connected — waiting for official Comax API docs".

import Link from "next/link";
import { ArrowLeft, PlugZap, RefreshCw, ShieldAlert } from "lucide-react";
import {
    Badge,
    Button,
    Card,
    CardTitle,
    PageHeader,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { comaxMockStatus } from "@/lib/comaxMock";

export default function ComaxIntegrationPage() {
    const { t } = useAdminI18n();
    const status = comaxMockStatus;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("comax.title")}
                description={t("comax.subtitle")}
                actions={
                    <>
                        <Link href="/admin/system">
                            <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />}>
                                {t("comax.backToSystem")}
                            </Button>
                        </Link>
                        {/* Manual sync is permanently disabled in this preview. */}
                        <Button
                            variant="primary"
                            size="sm"
                            iconStart={<RefreshCw size={14} />}
                            disabled
                            title={t("comax.actions.disabledHint")}
                        >
                            {t("comax.actions.manualSync")}
                        </Button>
                    </>
                }
            />

            {/* Prominent "not connected" banner */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <div>
                    <p className="font-medium">{t("comax.notConnectedBanner")}</p>
                    <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/80">
                        {t("comax.docsNote")}
                    </p>
                </div>
            </div>

            {/* Connection / health summary */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <div className="flex items-center gap-2">
                        <PlugZap size={16} className="text-gray-400" />
                        <CardTitle>{t("comax.connection.title")}</CardTitle>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">
                                {t("comax.connection.status")}
                            </dt>
                            <dd className="mt-1">
                                <Badge tone="neutral">{t("comax.connection.notConnected")}</Badge>
                            </dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">
                                {t("comax.connection.health")}
                            </dt>
                            <dd className="mt-1">
                                <Badge tone="warning">{t("comax.connection.disabled")}</Badge>
                            </dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">
                                {t("comax.connection.lastSync")}
                            </dt>
                            <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-50">
                                {status.lastSyncAt ?? t("comax.connection.never")}
                            </dd>
                        </div>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                            <dt className="text-xs uppercase tracking-wide text-gray-400">
                                {t("comax.connection.lastError")}
                            </dt>
                            <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-50">
                                {status.lastError ?? t("comax.connection.none")}
                            </dd>
                        </div>
                    </dl>
                </Card>

                <Card>
                    <CardTitle>{t("comax.about.title")}</CardTitle>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {t("comax.about.body")}
                    </p>
                </Card>
            </div>

            {/* Sync history (all "never") */}
            <Card padded={false}>
                <div className="px-5 pt-5">
                    <CardTitle>{t("comax.entities.title")}</CardTitle>
                </div>
                <div className="mt-3">
                    <TableContainer className="!border-0">
                        <Table>
                            <THead>
                                <TR>
                                    <TH>{t("comax.entities.entity")}</TH>
                                    <TH>{t("comax.entities.lastSync")}</TH>
                                    <TH>{t("comax.entities.status")}</TH>
                                    <TH align="center">{t("comax.entities.records")}</TH>
                                    <TH align="end">{t("comax.entities.action")}</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {status.entities.map((row) => (
                                    <TR key={row.key}>
                                        <TD>
                                            <span className="font-medium text-gray-900 dark:text-gray-50">
                                                {t(`comax.entities.${row.key}`)}
                                            </span>
                                        </TD>
                                        <TD muted>{row.lastSyncAt ?? "—"}</TD>
                                        <TD>
                                            <Badge tone="neutral">{t("comax.status.never")}</Badge>
                                        </TD>
                                        <TD align="center" muted className="tabular">
                                            {row.records}
                                        </TD>
                                        <TD align="end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled
                                                title={t("comax.actions.disabledHint")}
                                            >
                                                {t("comax.actions.sync")}
                                            </Button>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    </TableContainer>
                </div>
            </Card>
        </div>
    );
}
