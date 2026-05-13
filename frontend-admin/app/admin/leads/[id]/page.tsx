'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/context/AuthContext';
import api from '@/app/lib/api';
import { Lead, LeadStatus, TimelineEvent, LeadNote } from '@/types';
import ConvertLeadModal, { ConvertSubmitPayload, ConvertSubmitResult } from '@/components/leads/ConvertLeadModal';
import { useAdminI18n } from '@/i18n/I18nProvider';

// ═══════════════════════════════════════════════════════
// 📄  CRM Lead Detail Page
// ═══════════════════════════════════════════════════════

const STATUS_OPTIONS: LeadStatus[] = [
    'new', 'contacted', 'qualified', 'proposal', 'won', 'lost',
    'converted', 'closed', 'archived', 're-engaged',
];

const STATUS_COLORS: Record<LeadStatus, string> = {
    'new': 'bg-blue-100 text-blue-800',
    'contacted': 'bg-yellow-100 text-yellow-800',
    'qualified': 'bg-purple-100 text-purple-800',
    'proposal': 'bg-indigo-100 text-indigo-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800',
    'converted': 'bg-emerald-100 text-emerald-800',
    'closed': 'bg-gray-100 text-gray-800',
    'archived': 'bg-gray-200 text-gray-600',
    're-engaged': 'bg-teal-100 text-teal-800',
};

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useAdminI18n();

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [noteText, setNoteText] = useState('');
    const [newStatus, setNewStatus] = useState<LeadStatus>('new');
    const [assignOwner, setAssignOwner] = useState('');
    const [isConvertOpen, setIsConvertOpen] = useState(false);

    const leadId = params?.id as string;

    // ─── Fetch lead detail ───
    const fetchLead = useCallback(async () => {
        if (!leadId) return;
        try {
            const res = await api.get(`/crm/leads/${leadId}`, {

            });
            const data = res.data.data || res.data;
            setLead(data);
            setNewStatus(data.status);
            setAssignOwner(data.ownerId || '');
        } catch (err) {
            toast.error(t('leadDetail.toasts.loadFailed'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [leadId, t]);

    useEffect(() => {
        if (user) fetchLead();
    }, [fetchLead, user]);

    // ─── Change status ───
    const handleStatusChange = async () => {
        if (!lead || newStatus === lead.status) return;
        try {
            await api.patch(`/crm/leads/${leadId}/status`, { status: newStatus }, {

            });
            toast.success(t('leadDetail.toasts.statusUpdated', { status: t(`status.${newStatus}`) }));
            fetchLead();
        } catch (err) {
            toast.error(t('leadDetail.toasts.statusFailed'));
        }
    };

    // ─── Add note ───
    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            await api.post(`/crm/leads/${leadId}/notes`, { text: noteText }, {

            });
            toast.success(t('leadDetail.toasts.noteAdded'));
            setNoteText('');
            fetchLead();
        } catch (err) {
            toast.error(t('leadDetail.toasts.noteFailed'));
        }
    };

    // ─── Assign owner ───
    const handleAssign = async () => {
        if (!assignOwner.trim()) return;
        try {
            await api.patch(`/crm/leads/${leadId}/assign`, { ownerId: assignOwner }, {

            });
            toast.success(t('leadDetail.toasts.ownerAssigned'));
            fetchLead();
        } catch (err) {
            toast.error(t('leadDetail.toasts.ownerFailed'));
        }
    };

    // ─── Convert to customer ───
    const handleConvertSubmit = useCallback(async (payload: ConvertSubmitPayload): Promise<ConvertSubmitResult> => {
        const res = await api.post(`/crm/leads/${leadId}/convert`, payload);
        const data = res.data;
        if (data.idempotent) {
            toast(t('leadDetail.toasts.alreadyConverted'), { icon: 'ℹ️' });
        } else {
            toast.success(t('leadDetail.toasts.converted'));
        }
        return {
            success: !!data.success,
            idempotent: !!data.idempotent,
            company: data.company || null,
            user: data.user || null,
            tempPassword: data.tempPassword,
        };
    }, [leadId, t]);

    const isConverted = !!lead && (lead.status === 'converted' || !!lead.convertedToCompanyId);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">{t('leadDetail.states.loading')}</p></div>;
    }

    if (!lead) {
        return <div className="flex items-center justify-center h-screen"><p className="text-red-500">{t('leadDetail.states.notFound')}</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button onClick={() => router.push('/admin')} className="text-sm text-indigo-600 hover:underline mb-2 block">
                        {t('leadDetail.backToDashboard')}
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                    <p className="text-sm text-gray-500">{lead.phone} · {lead.email || t('leadDetail.noEmail')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[lead.status]}`}>
                    {t(`status.${lead.status}`)}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── Left: Lead Info + Actions ─── */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Info Card */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">{t('leadDetail.info.title')}</h2>
                        <div className="text-sm space-y-2 text-gray-600">
                            <p><strong>{t('leadDetail.info.source')}:</strong> {lead.source || '—'}</p>
                            <p><strong>{t('leadDetail.info.tags')}:</strong> {lead.tags?.length ? lead.tags.join(', ') : '—'}</p>
                            <p><strong>{t('leadDetail.info.contactCount')}:</strong> {lead.contactCount || 1}</p>
                            <p><strong>{t('leadDetail.info.lastContact')}:</strong> {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString() : '—'}</p>
                            <p><strong>{t('leadDetail.info.owner')}:</strong> {lead.ownerId || t('leadDetail.info.unassigned')}</p>
                            <p><strong>{t('leadDetail.info.created')}:</strong> {new Date(lead.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Conversion */}
                    {isConverted ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-emerald-800">{t('leadDetail.convertedCard.title')}</h2>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {t('leadDetail.convertedCard.badge')}
                                </span>
                            </div>
                            <div className="text-sm text-emerald-900 space-y-1.5">
                                {lead.convertedAt && (
                                    <p>
                                        <strong className="text-emerald-700">{t('leadDetail.convertedCard.convertedAt')}</strong>{' '}
                                        {new Date(lead.convertedAt).toLocaleString()}
                                    </p>
                                )}
                                {lead.convertedToCompanyId && (
                                    <p className="break-all">
                                        <strong className="text-emerald-700">{t('leadDetail.convertedCard.companyId')}</strong>{' '}
                                        <span className="font-mono text-xs">{lead.convertedToCompanyId}</span>
                                    </p>
                                )}
                                {lead.convertedToUserId ? (
                                    <p className="break-all">
                                        <strong className="text-emerald-700">{t('leadDetail.convertedCard.userId')}</strong>{' '}
                                        <span className="font-mono text-xs">{lead.convertedToUserId}</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-700/80">{t('leadDetail.convertedCard.noUserCreated')}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-5 space-y-3">
                            <h2 className="text-lg font-semibold text-gray-800">{t('leadDetail.convertCard.title')}</h2>
                            <p className="text-xs text-gray-500">
                                {t('leadDetail.convertCard.description')}
                            </p>
                            <button
                                onClick={() => setIsConvertOpen(true)}
                                className="w-full bg-emerald-600 text-white rounded py-2 text-sm font-medium hover:bg-emerald-700"
                            >
                                {t('leadDetail.convertCard.button')}
                            </button>
                        </div>
                    )}

                    {/* Change Status */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">{t('leadDetail.changeStatus.title')}</h2>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                            className="w-full border rounded px-3 py-2 text-sm"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{t(`status.${s}`)}</option>
                            ))}
                        </select>
                        <button onClick={handleStatusChange} className="w-full bg-indigo-600 text-white rounded py-2 text-sm hover:bg-indigo-700">
                            {t('leadDetail.changeStatus.button')}
                        </button>
                    </div>

                    {/* Assign Owner */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">{t('leadDetail.assign.title')}</h2>
                        <input
                            type="text"
                            value={assignOwner}
                            onChange={(e) => setAssignOwner(e.target.value)}
                            placeholder={t('leadDetail.assign.placeholder')}
                            className="w-full border rounded px-3 py-2 text-sm"
                        />
                        <button onClick={handleAssign} className="w-full bg-yellow-600 text-white rounded py-2 text-sm hover:bg-yellow-700">
                            {t('leadDetail.assign.button')}
                        </button>
                    </div>
                </div>

                {/* ─── Right: Timeline + Notes ─── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Timeline */}
                    <div className="bg-white rounded-lg shadow p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('leadDetail.timeline.title')}</h2>
                        {lead.timeline && lead.timeline.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {[...lead.timeline].reverse().map((event: TimelineEvent, i: number) => (
                                    <div key={i} className="flex items-start space-x-3 border-l-2 border-indigo-200 pl-4 py-1">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{event.type.replace(/_/g, ' ')}</p>
                                            <p className="text-xs text-gray-500">{new Date(event.at).toLocaleString()}</p>
                                            {event.meta && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {JSON.stringify(event.meta)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">{t('leadDetail.timeline.empty')}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg shadow p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('leadDetail.notes.title')}</h2>

                        {/* Add note */}
                        <div className="flex space-x-2 mb-4">
                            <input
                                type="text"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder={t('leadDetail.notes.placeholder')}
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            />
                            <button onClick={handleAddNote} className="bg-green-600 text-white rounded px-4 py-2 text-sm hover:bg-green-700">
                                {t('leadDetail.notes.addBtn')}
                            </button>
                        </div>

                        {lead.notes && lead.notes.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {[...lead.notes].reverse().map((note: LeadNote, i: number) => (
                                    <div key={i} className="bg-gray-50 rounded p-3">
                                        <p className="text-sm text-gray-700">{note.text}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">{t('leadDetail.notes.empty')}</p>
                        )}
                    </div>

                    {/* Convert modal */}
                    <ConvertLeadModal
                        isOpen={isConvertOpen}
                        onClose={() => setIsConvertOpen(false)}
                        lead={lead}
                        onSubmit={handleConvertSubmit}
                        onSuccess={fetchLead}
                    />

                    {/* Messages */}
                    {lead.messages && lead.messages.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-5">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('leadDetail.messages.title')}</h2>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {[...lead.messages].reverse().map((msg, i) => (
                                    <div key={i} className="bg-blue-50 rounded p-3">
                                        <p className="text-sm text-gray-700">{msg.content}</p>
                                        <p className="text-xs text-gray-400 mt-1">{msg.source} · {new Date(msg.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
