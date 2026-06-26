"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Inbox, RefreshCw, Search } from "lucide-react";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import {
    Button,
    EmptyState,
    Input,
    PageHeader,
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
import LeadEditModal from "@/components/leads/LeadEditModal";
import { formatDate } from "@/lib/format";
import { leadStatusTone } from "@/lib/status";
import type { Locale } from "@/i18n";
import type { Lead, LeadStatus } from "@/types";

const STATUS_VALUES: LeadStatus[] = [
    "new", "contacted", "qualified", "proposal", "won", "lost", "converted", "closed", "archived", "re-engaged",
];

export default function AgentDashboard() {
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/v1/leads");
            if (response.data.success || response.data.data) {
                setLeads(response.data.data?.leads || response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            toast.error(t("agent.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (user) fetchLeads();
    }, [user, fetchLeads]);

    const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l)));
        setSavingIds((prev) => new Set(prev).add(leadId));
        try {
            await api.patch(`/v1/leads/${leadId}`, { status: newStatus });
            toast.success(t("agent.toasts.statusUpdated"));
        } catch (error) {
            console.error(error);
            toast.error(t("agent.toasts.statusFailed"));
            fetchLeads();
        } finally {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
            });
        }
    };

    const handleSaveLead = async (leadId: string, data: Partial<Lead>) => {
        try {
            await api.patch(`/v1/leads/${leadId}`, data);
            toast.success(t("agent.toasts.leadUpdated"));
            fetchLeads();
        } catch (error) {
            console.error(error);
            toast.error(t("agent.toasts.leadFailed"));
        }
    };

    const filteredLeads = useMemo(() => {
        const query = search.toLowerCase();
        return leads.filter((lead) => {
            const matchesSearch =
                !query ||
                lead.name.toLowerCase().includes(query) ||
                lead.phone.includes(query) ||
                (lead.email?.toLowerCase().includes(query) ?? false);
            const matchesStatus = !statusFilter || lead.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [leads, search, statusFilter]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("dashboard.agentTitle")}
                description={t("dashboard.agentSubtitle")}
                actions={
                    <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchLeads}>
                        {t("common.refresh")}
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="sm:flex-grow sm:max-w-md">
                    <Input
                        placeholder={t("agent.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        iconStart={<Search size={14} />}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
                    className="sm:w-48"
                >
                    <option value="">{t("leads.filters.allStatuses")}</option>
                    {STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>{t(`status.${s}`)}</option>
                    ))}
                </Select>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("agent.table.name")}</TH>
                            <TH>{t("agent.table.contact")}</TH>
                            <TH>{t("agent.table.status")}</TH>
                            <TH>{t("agent.table.lastContact")}</TH>
                            <TH align="center">{t("agent.table.contacts")}</TH>
                            <TH align="end">{t("common.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={6} />
                        ) : leads.length === 0 ? (
                            <TR>
                                <TD colSpan={6}>
                                    <EmptyState icon={<Inbox size={18} />} title={t("agent.emptyAssigned")} />
                                </TD>
                            </TR>
                        ) : filteredLeads.length === 0 ? (
                            <TR>
                                <TD colSpan={6}>
                                    <EmptyState icon={<Inbox size={18} />} title={t("agent.emptyFiltered")} />
                                </TD>
                            </TR>
                        ) : (
                            filteredLeads.map((lead) => {
                                const latestNote = lead.notes?.length ? lead.notes[lead.notes.length - 1] : undefined;
                                const preview = latestNote && (latestNote.text.length > 60
                                    ? latestNote.text.slice(0, 60) + "…"
                                    : latestNote.text);
                                const tone = leadStatusTone[lead.status];
                                const toneBg: Record<typeof tone, string> = {
                                    neutral: "bg-gray-100 text-gray-700",
                                    info: "bg-blue-100 text-blue-800",
                                    success: "bg-green-100 text-green-800",
                                    warning: "bg-amber-100 text-amber-800",
                                    danger: "bg-red-100 text-red-800",
                                    indigo: "bg-indigo-100 text-indigo-800",
                                    purple: "bg-purple-100 text-purple-800",
                                    teal: "bg-teal-100 text-teal-800",
                                    emerald: "bg-emerald-100 text-emerald-800",
                                };
                                return (
                                    <TR key={lead._id}>
                                        <TD>
                                            <div className="font-medium text-gray-900 dark:text-gray-50">{lead.name}</div>
                                            <div className="text-xs text-gray-400">{lead.source}</div>
                                            {preview && (
                                                <div className="text-xs text-gray-500 italic mt-0.5 max-w-xs truncate" title={latestNote?.text}>
                                                    {preview}
                                                </div>
                                            )}
                                        </TD>
                                        <TD muted>
                                            <div className="text-gray-900 dark:text-gray-100">{lead.phone}</div>
                                            {lead.email && <div className="text-xs text-gray-400">{lead.email}</div>}
                                        </TD>
                                        <TD>
                                            <Select
                                                pill
                                                value={lead.status}
                                                disabled={savingIds.has(lead._id)}
                                                onChange={(e) => handleQuickStatusChange(lead._id, e.target.value as LeadStatus)}
                                                className={`!h-6 ${toneBg[tone]}`}
                                            >
                                                {STATUS_VALUES.map((s) => (
                                                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                                                ))}
                                            </Select>
                                        </TD>
                                        <TD muted>{formatDate(lead.lastContactAt, locale as Locale)}</TD>
                                        <TD align="center" muted>
                                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200 tabular">
                                                {lead.contactCount ?? 0}
                                            </span>
                                        </TD>
                                        <TD align="end">
                                            <div className="flex items-center justify-end gap-2">
                                                {lead.phone && (
                                                    <a
                                                        href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button size="sm" variant="ghost">{t("agent.actions.whatsapp")}</Button>
                                                    </a>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setCurrentLead(lead);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    {t("agent.actions.notes")}
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

            <LeadEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={currentLead}
                agents={[]}
                canAssign={false}
                onSave={handleSaveLead}
            />
        </div>
    );
}
