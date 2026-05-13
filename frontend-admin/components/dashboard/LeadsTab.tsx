"use client";

import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import {
    Button,
    EmptyState,
    Input,
    Pagination,
    Select,
    Table,
    TableContainer,
    TableSkeleton,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { LeadStatusBadge } from "./StatusBadges";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/i18n";
import type { Lead, LeadStatus, User } from "@/types";

interface LeadsTabProps {
    leads: Lead[];
    users: User[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    agentFilter: string;
    onAgentFilterChange: (value: string) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onEdit: (lead: Lead) => void;
}

const LEAD_STATUSES: LeadStatus[] = [
    "new", "contacted", "qualified", "proposal", "won", "lost", "converted", "closed", "archived", "re-engaged",
];

export function LeadsTab({
    leads,
    users,
    loading,
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    agentFilter,
    onAgentFilterChange,
    page,
    totalPages,
    onPageChange,
    onEdit,
}: LeadsTabProps) {
    const { t, locale } = useAdminI18n();
    const agents = users.filter((u) => u.role === "agent");

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-grow sm:max-w-sm">
                    <Input
                        placeholder={t("leads.filters.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        iconStart={<Search size={14} />}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
                    <Select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="sm:w-44">
                        <option value="">{t("leads.filters.allStatuses")}</option>
                        {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>{t(`status.${s}`)}</option>
                        ))}
                    </Select>
                    <Select value={agentFilter} onChange={(e) => onAgentFilterChange(e.target.value)} className="sm:w-48">
                        <option value="">{t("leads.filters.allAgents")}</option>
                        {agents.map((a) => (
                            <option key={a._id} value={a._id}>{a.name || a.email}</option>
                        ))}
                    </Select>
                </div>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("leads.table.name")}</TH>
                            <TH>{t("leads.table.status")}</TH>
                            <TH align="center">{t("leads.table.count")}</TH>
                            <TH>{t("leads.table.assignedTo")}</TH>
                            <TH>{t("leads.table.lastContact")}</TH>
                            <TH align="end">{t("leads.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={6} />
                        ) : leads.length === 0 ? (
                            <TR>
                                <TD colSpan={6}>
                                    <EmptyState
                                        icon={<Inbox size={18} />}
                                        title={t("leads.empty")}
                                        description={t("leads.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            leads.map((lead) => {
                                const agent = users.find((u) => u._id === lead.assignedTo);
                                return (
                                    <TR key={lead._id}>
                                        <TD>
                                            <div className="font-medium text-gray-900 dark:text-gray-50">{lead.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{lead.phone}</div>
                                        </TD>
                                        <TD><LeadStatusBadge status={lead.status} /></TD>
                                        <TD align="center" muted>
                                            <span className="tabular">{lead.contactCount || 1}</span>
                                        </TD>
                                        <TD muted>{agent ? agent.name || agent.email : "—"}</TD>
                                        <TD muted>
                                            {formatDate(lead.lastContactAt || lead.createdAt, locale as Locale)}
                                        </TD>
                                        <TD align="end">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/leads/${lead._id}`}>
                                                    <Button size="sm" variant="ghost">{t("common.view")}</Button>
                                                </Link>
                                                <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                                                    {t("common.edit")}
                                                </Button>
                                            </div>
                                        </TD>
                                    </TR>
                                );
                            })
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
    );
}
