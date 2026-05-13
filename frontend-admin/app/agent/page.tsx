"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/app/lib/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { Lead, LeadStatus } from "@/types";
import LeadEditModal from "@/components/leads/LeadEditModal";
import { useAdminI18n } from "@/i18n/I18nProvider";

const STATUS_VALUES: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
    "converted",
    "closed",
    "archived",
    "re-engaged",
];

const STATUS_COLORS: Record<string, string> = {
    new:        "bg-blue-100 text-blue-800",
    contacted:  "bg-yellow-100 text-yellow-800",
    qualified:  "bg-purple-100 text-purple-800",
    proposal:   "bg-indigo-100 text-indigo-800",
    won:        "bg-green-100 text-green-800",
    lost:       "bg-red-100 text-red-800",
    converted:  "bg-green-100 text-green-800",
    closed:     "bg-gray-100 text-gray-800",
    archived:   "bg-gray-100 text-gray-500",
    "re-engaged": "bg-teal-100 text-teal-800",
};

export default function AgentDashboard() {
    const { user } = useAuth();
    const { t } = useAdminI18n();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    // Track which leads are mid-status-save so the select shows a subtle disabled state
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    // Filter state
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");

    // Modal state (for notes / tags — not needed for quick status)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/leads");
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

    // ── Quick status change (no modal) ──────────────────────────────────
    const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        // Optimistic update
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
        setSavingIds(prev => new Set(prev).add(leadId));
        try {
            await api.patch(`/leads/${leadId}`, { status: newStatus });
            toast.success(t("agent.toasts.statusUpdated"));
        } catch (error) {
            console.error(error);
            toast.error(t("agent.toasts.statusFailed"));
            // Roll back by refetching
            fetchLeads();
        } finally {
            setSavingIds(prev => { const next = new Set(prev); next.delete(leadId); return next; });
        }
    };

    // ── Full modal save (notes / tags) ───────────────────────────────────
    const handleSaveLead = async (leadId: string, data: Partial<Lead>) => {
        try {
            await api.patch(`/leads/${leadId}`, data);
            toast.success(t("agent.toasts.leadUpdated"));
            fetchLeads();
        } catch (error) {
            console.error(error);
            toast.error(t("agent.toasts.leadFailed"));
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString();
    };

    const query = search.toLowerCase();
    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            !query ||
            lead.name.toLowerCase().includes(query) ||
            lead.phone.includes(query) ||
            (lead.email?.toLowerCase().includes(query) ?? false);
        const matchesStatus = !statusFilter || lead.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{t('agent.myLeads')}</h1>
                <button
                    onClick={fetchLeads}
                    className="text-sm text-blue-600 hover:text-blue-800 border px-3 py-1 rounded"
                >
                    {t('common.refresh')}
                </button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder={t('agent.searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-grow border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as LeadStatus | "")}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                >
                    <option value="">{t('leads.filters.allStatuses')}</option>
                    {STATUS_VALUES.map(s => (
                        <option key={s} value={s}>{t(`status.${s}`)}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('agent.loading')}</div>
                ) : leads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">{t('agent.emptyAssigned')}</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">{t('agent.emptyFiltered')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('agent.table.name')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('agent.table.contact')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('agent.table.status')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('agent.table.lastContact')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('agent.table.contacts')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors">

                                        {/* Name + source + latest note preview */}
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                            <div className="text-xs text-gray-400">{lead.source}</div>
                                            {lead.notes?.length > 0 && (() => {
                                                const latest = lead.notes[lead.notes.length - 1];
                                                const preview = latest.text.length > 60
                                                    ? latest.text.slice(0, 60) + "…"
                                                    : latest.text;
                                                return (
                                                    <div className="text-xs text-gray-400 italic mt-0.5 max-w-xs truncate" title={latest.text}>
                                                        {preview}
                                                    </div>
                                                );
                                            })()}
                                        </td>

                                        {/* Phone + email */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{lead.phone}</div>
                                            {lead.email && (
                                                <div className="text-xs text-gray-400">{lead.email}</div>
                                            )}
                                        </td>

                                        {/* Inline status select */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={lead.status}
                                                disabled={savingIds.has(lead._id)}
                                                onChange={(e) => handleQuickStatusChange(lead._id, e.target.value as LeadStatus)}
                                                className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}
                                            >
                                                {STATUS_VALUES.map(s => (
                                                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Last contact date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(lead.lastContactAt)}
                                        </td>

                                        {/* Contact count */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                                {lead.contactCount ?? 0}
                                            </span>
                                        </td>

                                        {/* Actions: WhatsApp + Edit */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                            {lead.phone && (
                                                <a
                                                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 hover:text-green-900"
                                                    title={`${t('agent.actions.whatsapp')} ${lead.name}`}
                                                >
                                                    {t('agent.actions.whatsapp')}
                                                </a>
                                            )}
                                            <button
                                                onClick={() => { setCurrentLead(lead); setIsModalOpen(true); }}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                {t('agent.actions.notes')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal restricted to notes + tags — no agent reassignment */}
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
