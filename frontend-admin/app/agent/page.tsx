"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { Lead } from "@/types";
import LeadEditModal from "@/components/leads/LeadEditModal";

export default function AgentDashboard() {
    const { token } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            // Backend now enforces agent filtering, but we can pass explicit param too
            const response = await axios.get("/api/leads", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success || response.data.data) {
                setLeads(response.data.data?.leads || response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchLeads();
        }
    }, [token, fetchLeads]);

    const handleEditClick = (lead: Lead) => {
        setCurrentLead(lead);
        setIsModalOpen(true);
    };

    const handleSaveLead = async (leadId: string, data: Partial<Lead>) => {
        try {
            await axios.patch(`/api/leads/${leadId}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Lead updated successfully");
            fetchLeads();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update lead");
        }
    };

    return (
        <div className="space-y-6">
            <Toaster />
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">My Leads (Agent Consolidated View)</h1>
                <button
                    onClick={fetchLeads}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading assignments...</div>
                ) : leads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No leads assigned.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {leads.map((lead) => (
                                    <tr key={lead._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                            <div className="text-sm text-gray-500">{lead.source}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{lead.phone}</div>
                                            <div className="text-sm text-gray-500">{lead.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                        lead.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-green-100 text-green-800'}`}>
                                                {lead.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEditClick(lead)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Restricted Modal */}
            <LeadEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={currentLead}
                agents={[]} // Agents cannot reassign, so list is empty
                canAssign={false} // Explicitly disable assignment
                onSave={handleSaveLead}
            />
        </div>
    );
}
