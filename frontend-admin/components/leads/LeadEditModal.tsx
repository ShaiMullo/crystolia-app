"use client";

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Lead, User, LeadStatus } from '@/types';
import { useAdminI18n } from '@/i18n/I18nProvider';

interface LeadEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    agents: User[]; // Pass list of agents for assignment
    onSave: (leadId: string, data: Partial<Lead>) => Promise<void>;
    canAssign?: boolean;
}

export default function LeadEditModal({ isOpen, onClose, lead, agents, onSave, canAssign = true }: LeadEditModalProps) {
    const { t } = useAdminI18n();
    // Hooks must be unconditional
    const [status, setStatus] = useState<Lead['status']>(lead?.status || 'new');
    const [assignedTo, setAssignedTo] = useState(lead?.assignedTo || '');
    const [noteText, setNoteText] = useState('');
    const [tags, setTags] = useState(lead?.tags?.join(', ') || '');
    const [loading, setLoading] = useState(false);

    // Sync state when lead changes (only if valid lead exists)
    useEffect(() => {
        if (lead) {
            setStatus(lead.status);
            setAssignedTo(lead.assignedTo || '');
            setNoteText(''); // Reset note input on open
            setTags(lead.tags?.join(', ') || '');
        }
    }, [lead, isOpen]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead) return;

        setLoading(true);
        try {
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

            // Prepare payload
            const payload: Partial<Lead> = {
                status,
                assignedTo,
                tags: tagsArray
            };

            // Only append note if text is provided
            if (noteText.trim()) {
                const newNote = {
                    text: noteText.trim(),
                    createdAt: new Date().toISOString()
                };
                // Append to existing notes
                payload.notes = [...(lead.notes || []), newNote];
            }

            await onSave(lead._id, payload);
            onClose();
        } catch (error) {
            console.error("Failed to update lead", error);
        } finally {
            setLoading(false);
        }
    };



    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('leads.modal.editTitle', { name: lead.name })}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('leads.modal.status')}</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Lead['status'])}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                    >
                        <option value="new">{t('status.new')}</option>
                        <option value="contacted">{t('status.contacted')}</option>
                        <option value="qualified">{t('status.qualified')}</option>
                        <option value="proposal">{t('status.proposal')}</option>
                        <option value="won">{t('status.won')}</option>
                        <option value="lost">{t('status.lost')}</option>
                        <option value="converted">{t('status.converted')}</option>
                        <option value="closed">{t('status.closed')}</option>
                        <option value="archived">{t('status.archived')}</option>
                        <option value="re-engaged">{t('status.re-engaged')}</option>
                    </select>
                </div>

                {/* Assignment */}
                {canAssign && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('leads.modal.assignAgent')}</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                        >
                            <option value="">{t('leads.modal.unassigned')}</option>
                            {agents.map(agent => (
                                <option key={agent._id} value={agent._id}>
                                    {agent.name || agent.email}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('leads.modal.tagsLabel')}</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder={t('leads.modal.tagsPlaceholder')}
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('leads.modal.addNote')}</label>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder={t('leads.modal.addNotePlaceholder')}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? t('common.saving') : t('leads.modal.saveChanges')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
