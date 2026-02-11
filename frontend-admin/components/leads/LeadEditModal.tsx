"use client";

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Lead, User } from '@/types';

interface LeadEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    agents: User[]; // Pass list of agents for assignment
    onSave: (leadId: string, data: Partial<Lead>) => Promise<void>;
    canAssign?: boolean;
}

export default function LeadEditModal({ isOpen, onClose, lead, agents, onSave, canAssign = true }: LeadEditModalProps) {
    // Hooks must be unconditional
    const [status, setStatus] = useState<Lead['status']>(lead?.status || 'new');
    const [assignedTo, setAssignedTo] = useState(lead?.assignedTo || '');
    const [notes, setNotes] = useState(lead?.notes || '');
    const [tags, setTags] = useState(lead?.tags?.join(', ') || '');
    const [loading, setLoading] = useState(false);

    // Sync state when lead changes (only if valid lead exists)
    useEffect(() => {
        if (lead) {
            setStatus(lead.status);
            setAssignedTo(lead.assignedTo || '');
            setNotes(lead.notes || '');
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
            await onSave(lead._id, { status, assignedTo, notes, tags: tagsArray });
            onClose();
        } catch (error) {
            console.error("Failed to update lead", error);
        } finally {
            setLoading(false);
        }
    };



    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Lead: ${lead.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Lead['status'])}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                    >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="closed">Closed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Assignment */}
                {canAssign && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assign Agent</label>
                        <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                        >
                            <option value="">-- Unassigned --</option>
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
                    <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder="vip, urgent, referral"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder="Internal notes..."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
