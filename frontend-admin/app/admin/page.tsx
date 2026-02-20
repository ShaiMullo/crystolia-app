"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/app/lib/api";
import { toast, Toaster } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { Lead, User, AuditLog, LeadStatus } from "@/types";
import LeadEditModal from "@/components/leads/LeadEditModal";
import UserActionModal from "@/components/users/UserActionModal";
import Link from 'next/link';


export default function AdminDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'audit'>('leads');

    // Data
    const [leads, setLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [agentFilter, setAgentFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');

    // ------------------------------------------------------------------
    // Fetchers
    // ------------------------------------------------------------------

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            if (statusFilter) params.append('status', statusFilter);
            if (agentFilter) params.append('assignedTo', agentFilter); // Backend expects assignedTo
            if (searchQuery) params.append('search', searchQuery);

            const response = await api.get(`/leads?${params.toString()}`, {

            });

            if (response.data.success && response.data.data) {
                setLeads(response.data.data.leads || []);
                if (response.data.data.pagination) {
                    setTotalPages(response.data.data.pagination.pages);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, agentFilter, searchQuery]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/users", {

            });
            if (response.data.success || response.data.data) {
                setUsers(response.data.data || []);
            }
        } catch (error) {
            console.error(error);
            // toast.error("User management API not ready");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(`/audit?page=${page}&limit=${limit}`, {

            });
            if (response.data.success) {
                setAuditLogs(response.data.data || []);
                // Backend returns pagination at root level for audit
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.pages);
                }
            }
        } catch (error) {
            console.error(error);
            setAuditLogs([]); // Fallback
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        if (user) {
            if (activeTab === 'leads') fetchLeads();
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'audit') fetchAuditLogs();
        }
    }, [user, activeTab, fetchLeads, fetchUsers, fetchAuditLogs]);

    // Reset page when filters change OR tab changes
    useEffect(() => {
        setPage(1);
    }, [statusFilter, agentFilter, searchQuery, activeTab]);

    // ------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------

    // LEADS
    const handleEditLead = (lead: Lead) => {
        setCurrentLead(lead);
        setIsLeadModalOpen(true);
    };

    const handleSaveLead = async (leadId: string, data: Partial<Lead>) => {
        try {
            await api.patch(`/leads/${leadId}`, data, {

            });
            toast.success("Lead updated successfully");
            fetchLeads();
        } catch (error) {
            toast.error("Failed to update lead");
            console.error(error);
        }
    };

    // USERS
    const handleCreateUser = () => {
        setCurrentUser(null);
        setUserModalMode('create');
        setIsUserModalOpen(true);
    };

    const handleEditUser = (u: User) => {
        setCurrentUser(u);
        setUserModalMode('edit');
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
        try {
            if (userModalMode === 'create') {
                await api.post("/users", data, {

                });
                toast.success("User created successfully");
            } else {
                if (!currentUser) return;
                await api.patch(`/users/${currentUser._id}`, data, {

                });
                toast.success("User updated successfully");
            }
            fetchUsers();
        } catch (error) {
            toast.error("Failed to save user");
            console.error(error);
        }
    };

    const handleToggleActive = async (u: User) => {
        if (!confirm(`Are you sure you want to ${u.isActive ? 'deactivate' : 'activate'} this user?`)) return;
        try {
            await api.patch(`/users/${u._id}`, { isActive: !u.isActive }, {

            });
            toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
            fetchUsers();
        } catch {
            toast.error("Action failed");
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <Toaster />

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['leads', 'users', 'audit'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'leads' | 'users' | 'audit')}
                            className={`${activeTab === tab
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {tab === 'leads' ? 'Leads Management' : tab === 'users' ? 'User Management' : 'Audit Logs'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                        {activeTab === 'leads' ? 'All Leads' : activeTab === 'users' ? 'System Users' : 'System Audit Logs'}
                    </h2>

                    <div className="flex space-x-2">
                        {activeTab === 'users' && (
                            <button
                                onClick={handleCreateUser}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                                + Create User
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === 'leads') fetchLeads();
                                if (activeTab === 'users') fetchUsers();
                                if (activeTab === 'audit') fetchAuditLogs();
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 border px-3 py-1 rounded"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* FILTERS (Leads Only) */}
                {activeTab === 'leads' && (
                    <div className="mb-6 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow max-w-md">
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="proposal">Proposal</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                            <option value="converted">Converted</option>
                            <option value="closed">Closed</option>
                            <option value="archived">Archived</option>
                            <option value="re-engaged">Re-engaged</option>
                        </select>
                        <select
                            value={agentFilter}
                            onChange={(e) => setAgentFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">All Agents</option>
                            {users.filter(u => u.role === 'agent').map(agent => (
                                <option key={agent._id} value={agent._id}>
                                    {agent.name || agent.email}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading data...</div>
                ) : (
                    <>
                        {/* LEADS TABLE */}
                        {activeTab === 'leads' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Contact</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {leads.map((lead) => {
                                                const assignedAgent = users.find(u => u._id === lead.assignedTo);
                                                return (
                                                    <tr key={lead._id}>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                                            <div className="text-sm text-gray-500">{lead.phone}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                                ${lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                                        lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                                                                            lead.status === 'proposal' ? 'bg-indigo-100 text-indigo-800' :
                                                                                lead.status === 'won' ? 'bg-green-100 text-green-800' :
                                                                                    lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                                                                                        lead.status === 're-engaged' ? 'bg-teal-100 text-teal-800' :
                                                                                            lead.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                                                                                'bg-green-100 text-green-800'}`}>
                                                                {lead.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {lead.contactCount || 1}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {assignedAgent ? assignedAgent.name || assignedAgent.email : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                                            {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : new Date(lead.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                                            <Link
                                                                href={`/admin/leads/${lead._id}`}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                View
                                                            </Link>
                                                            <button
                                                                onClick={() => handleEditLead(lead)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {leads.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No leads found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* PAGINATION */}
                                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>Previous</span>
                                                </button>
                                                <button
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>Next</span>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* USERS TABLE */}
                        {activeTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {users.map((u) => (
                                            <tr key={u._id}>
                                                <td className="px-6 py-4">{u.name || 'N/A'}</td>
                                                <td className="px-6 py-4">{u.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                                    <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                                    <button onClick={() => handleToggleActive(u)} className={`${u.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* AUDIT TABLE */}
                        {activeTab === 'audit' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {auditLogs.map((log) => (
                                                <tr key={log._id}>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {log.performedBy?.email || 'System'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                                        {log.action}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {log.entity} / {log.entityId?.substring(0, 8)}...
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {JSON.stringify(log.details)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {auditLogs.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No audit logs found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* PAGINATION */}
                                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>Previous</span>
                                                </button>
                                                <button
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>Next</span>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <LeadEditModal
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                lead={currentLead}
                agents={users.filter(u => u.role === 'agent')}
                onSave={handleSaveLead}
            />

            <UserActionModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                mode={userModalMode}
                user={currentUser}
                onSave={handleSaveUser}
            />
        </div>
    );
}
