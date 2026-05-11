'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/app/context/AuthContext';
import api from '@/app/lib/api';
import { Lead, LeadStatus, TimelineEvent, LeadNote } from '@/types';
import ConvertLeadModal, { ConvertSubmitPayload, ConvertSubmitResult } from '@/components/leads/ConvertLeadModal';

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
            toast.error('Failed to load lead');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        if (user) fetchLead();
    }, [fetchLead, user]);

    // ─── Change status ───
    const handleStatusChange = async () => {
        if (!lead || newStatus === lead.status) return;
        try {
            await api.patch(`/crm/leads/${leadId}/status`, { status: newStatus }, {

            });
            toast.success(`Status updated to ${newStatus}`);
            fetchLead();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    // ─── Add note ───
    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            await api.post(`/crm/leads/${leadId}/notes`, { text: noteText }, {

            });
            toast.success('Note added');
            setNoteText('');
            fetchLead();
        } catch (err) {
            toast.error('Failed to add note');
        }
    };

    // ─── Assign owner ───
    const handleAssign = async () => {
        if (!assignOwner.trim()) return;
        try {
            await api.patch(`/crm/leads/${leadId}/assign`, { ownerId: assignOwner }, {

            });
            toast.success('Owner assigned');
            fetchLead();
        } catch (err) {
            toast.error('Failed to assign owner');
        }
    };

    // ─── Convert to customer ───
    const handleConvertSubmit = useCallback(async (payload: ConvertSubmitPayload): Promise<ConvertSubmitResult> => {
        const res = await api.post(`/crm/leads/${leadId}/convert`, payload);
        const data = res.data;
        if (data.idempotent) {
            toast('Lead was already converted', { icon: 'ℹ️' });
        } else {
            toast.success('Lead converted to customer');
        }
        return {
            success: !!data.success,
            idempotent: !!data.idempotent,
            company: data.company || null,
            user: data.user || null,
            tempPassword: data.tempPassword,
        };
    }, [leadId]);

    const isConverted = !!lead && (lead.status === 'converted' || !!lead.convertedToCompanyId);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading…</p></div>;
    }

    if (!lead) {
        return <div className="flex items-center justify-center h-screen"><p className="text-red-500">Lead not found</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button onClick={() => router.push('/admin')} className="text-sm text-indigo-600 hover:underline mb-2 block">
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                    <p className="text-sm text-gray-500">{lead.phone} · {lead.email || 'No email'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── Left: Lead Info + Actions ─── */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Info Card */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">Lead Info</h2>
                        <div className="text-sm space-y-2 text-gray-600">
                            <p><strong>Source:</strong> {lead.source || '-'}</p>
                            <p><strong>Tags:</strong> {lead.tags?.length ? lead.tags.join(', ') : '-'}</p>
                            <p><strong>Contact Count:</strong> {lead.contactCount || 1}</p>
                            <p><strong>Last Contact:</strong> {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString() : '-'}</p>
                            <p><strong>Owner:</strong> {lead.ownerId || 'Unassigned'}</p>
                            <p><strong>Created:</strong> {new Date(lead.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Conversion */}
                    {isConverted ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-emerald-800">Converted</h2>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    customer
                                </span>
                            </div>
                            <div className="text-sm text-emerald-900 space-y-1.5">
                                {lead.convertedAt && (
                                    <p>
                                        <strong className="text-emerald-700">Converted at:</strong>{' '}
                                        {new Date(lead.convertedAt).toLocaleString()}
                                    </p>
                                )}
                                {lead.convertedToCompanyId && (
                                    <p className="break-all">
                                        <strong className="text-emerald-700">Company ID:</strong>{' '}
                                        <span className="font-mono text-xs">{lead.convertedToCompanyId}</span>
                                    </p>
                                )}
                                {lead.convertedToUserId ? (
                                    <p className="break-all">
                                        <strong className="text-emerald-700">User ID:</strong>{' '}
                                        <span className="font-mono text-xs">{lead.convertedToUserId}</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-700/80">No customer user was created.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-5 space-y-3">
                            <h2 className="text-lg font-semibold text-gray-800">Convert</h2>
                            <p className="text-xs text-gray-500">
                                Create a Company (and optionally a customer login) from this lead.
                            </p>
                            <button
                                onClick={() => setIsConvertOpen(true)}
                                className="w-full bg-emerald-600 text-white rounded py-2 text-sm font-medium hover:bg-emerald-700"
                            >
                                Convert to Customer
                            </button>
                        </div>
                    )}

                    {/* Change Status */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">Change Status</h2>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                            className="w-full border rounded px-3 py-2 text-sm"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <button onClick={handleStatusChange} className="w-full bg-indigo-600 text-white rounded py-2 text-sm hover:bg-indigo-700">
                            Update Status
                        </button>
                    </div>

                    {/* Assign Owner */}
                    <div className="bg-white rounded-lg shadow p-5 space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">Assign Owner</h2>
                        <input
                            type="text"
                            value={assignOwner}
                            onChange={(e) => setAssignOwner(e.target.value)}
                            placeholder="Owner ID or name"
                            className="w-full border rounded px-3 py-2 text-sm"
                        />
                        <button onClick={handleAssign} className="w-full bg-yellow-600 text-white rounded py-2 text-sm hover:bg-yellow-700">
                            Assign
                        </button>
                    </div>
                </div>

                {/* ─── Right: Timeline + Notes ─── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Timeline */}
                    <div className="bg-white rounded-lg shadow p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Timeline</h2>
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
                            <p className="text-gray-400 text-sm">No timeline events yet.</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg shadow p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Notes</h2>

                        {/* Add note */}
                        <div className="flex space-x-2 mb-4">
                            <input
                                type="text"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add a note..."
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            />
                            <button onClick={handleAddNote} className="bg-green-600 text-white rounded px-4 py-2 text-sm hover:bg-green-700">
                                Add
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
                            <p className="text-gray-400 text-sm">No notes yet.</p>
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
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Messages</h2>
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
