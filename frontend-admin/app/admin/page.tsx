"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/app/lib/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { Lead, User, AuditLog, LeadStatus, Order, OrderStatus, Invoice, InvoiceStatus } from "@/types";
import LeadEditModal from "@/components/leads/LeadEditModal";
import UserActionModal from "@/components/users/UserActionModal";
import Modal from "@/components/ui/Modal";
import Link from 'next/link';
import { useAdminI18n } from "@/i18n/I18nProvider";


export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<'leads' | 'users' | 'audit' | 'orders' | 'invoices'>('leads');

    // Data
    const [leads, setLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Orders — per-row saving state, status filter, detail view
    const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(new Set());
    const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | ''>('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Invoices
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [savingInvoiceIds, setSavingInvoiceIds] = useState<Set<string>>(new Set());
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | ''>('');
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        orderId: '',
        companyId: '',
        invoiceNumber: '',
        totalAmount: '',
        dueDate: '',
        notes: '',
        status: 'draft' as InvoiceStatus,
    });
    const [invoiceFormSaving, setInvoiceFormSaving] = useState(false);
    const [issuingInvoiceIds, setIssuingInvoiceIds] = useState<Set<string>>(new Set());

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
            toast.error(t("leads.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, agentFilter, searchQuery, t]);

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

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/orders');
            if (response.data.success) {
                setOrders(response.data.data || []);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('orders.toasts.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/invoices');
            if (response.data.success) {
                setInvoices(response.data.data || []);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('invoices.toasts.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            if (activeTab === 'leads') fetchLeads();
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'audit') fetchAuditLogs();
            if (activeTab === 'orders') fetchOrders();
            if (activeTab === 'invoices') { fetchInvoices(); fetchOrders(); }
        }
    }, [user, activeTab, fetchLeads, fetchUsers, fetchAuditLogs, fetchOrders, fetchInvoices]);

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
            toast.success(t("leads.toasts.updated"));
            fetchLeads();
        } catch (error) {
            toast.error(t("leads.toasts.updateFailed"));
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
                toast.success(t("users.toasts.created"));
            } else {
                if (!currentUser) return;
                await api.patch(`/users/${currentUser._id}`, data, {

                });
                toast.success(t("users.toasts.updated"));
            }
            fetchUsers();
        } catch (error) {
            toast.error(t("users.toasts.saveFailed"));
            console.error(error);
        }
    };

    const handleToggleActive = async (u: User) => {
        const confirmMsg = u.isActive ? t("users.confirmToggle") : t("users.confirmActivate");
        if (!confirm(confirmMsg)) return;
        try {
            await api.patch(`/users/${u._id}`, { isActive: !u.isActive }, {

            });
            toast.success(u.isActive ? t("users.toasts.deactivated") : t("users.toasts.activated"));
            fetchUsers();
        } catch {
            toast.error(t("users.toasts.actionFailed"));
        }
    };

    // ORDERS
    const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
        setSavingOrderIds(prev => new Set(prev).add(orderId));
        try {
            await api.patch(`/orders/${orderId}`, { status: newStatus });
            toast.success(t('orders.toasts.updated'));
        } catch (error) {
            console.error(error);
            toast.error(t('orders.toasts.updateFailed'));
            fetchOrders();
        } finally {
            setSavingOrderIds(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    };

    // INVOICES
    const handleInvoiceStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
        setInvoices(prev => prev.map(inv => inv._id === invoiceId ? { ...inv, status: newStatus } : inv));
        setSavingInvoiceIds(prev => new Set(prev).add(invoiceId));
        try {
            await api.patch(`/invoices/${invoiceId}`, { status: newStatus });
            toast.success(t('invoices.toasts.updated'));
        } catch (error) {
            console.error(error);
            toast.error(t('invoices.toasts.updateFailed'));
            fetchInvoices();
        } finally {
            setSavingInvoiceIds(prev => { const next = new Set(prev); next.delete(invoiceId); return next; });
        }
    };

    const handleIssueInvoice = async (invoiceId: string) => {
        setIssuingInvoiceIds(prev => new Set(prev).add(invoiceId));
        try {
            const response = await api.post(`/invoices/${invoiceId}/issue`);
            toast.success(t('invoices.toasts.issued'));
            fetchInvoices();
            const pdfUrl = response.data?.pdfUrl;
            if (pdfUrl) {
                window.open(pdfUrl, '_blank', 'noopener,noreferrer');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('invoices.toasts.issueFailed'));
        } finally {
            setIssuingInvoiceIds(prev => { const next = new Set(prev); next.delete(invoiceId); return next; });
        }
    };

    const handleCreateInvoice = async () => {
        if (!invoiceForm.invoiceNumber.trim()) {
            toast.error(t('invoices.toasts.invoiceNumberRequired'));
            return;
        }
        const amount = parseFloat(invoiceForm.totalAmount);
        if (isNaN(amount) || amount < 0) {
            toast.error(t('invoices.toasts.amountRequired'));
            return;
        }
        // company must come from selected order or be provided explicitly
        const companyId = invoiceForm.companyId;
        if (!companyId) {
            toast.error(t('invoices.toasts.orderRequired'));
            return;
        }
        setInvoiceFormSaving(true);
        try {
            await api.post('/invoices', {
                company: companyId,
                ...(invoiceForm.orderId && { order: invoiceForm.orderId }),
                invoiceNumber: invoiceForm.invoiceNumber.trim(),
                totalAmount: amount,
                status: invoiceForm.status,
                ...(invoiceForm.dueDate && { dueDate: invoiceForm.dueDate }),
                ...(invoiceForm.notes.trim() && { notes: invoiceForm.notes.trim() }),
            });
            toast.success(t('invoices.toasts.created'));
            setIsCreateInvoiceOpen(false);
            setInvoiceForm({ orderId: '', companyId: '', invoiceNumber: '', totalAmount: '', dueDate: '', notes: '', status: 'draft' });
            fetchInvoices();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || t('invoices.toasts.createFailed'));
        } finally {
            setInvoiceFormSaving(false);
        }
    };

    if (!user) return null;

    // ── Shared order helpers ──────────────────────────────────────────────
    const ORDER_STATUS_COLORS: Record<string, string> = {
        pending:   'bg-amber-100 text-amber-800',
        approved:  'bg-blue-100 text-blue-800',
        shipped:   'bg-indigo-100 text-indigo-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const getOrderCompanyName = (order: Order): string => {
        if (!order.company) return '—';
        if (typeof order.company === 'object') return order.company.name;
        return order.company;
    };

    // ── Shared invoice helpers ────────────────────────────────────────────
    const INVOICE_STATUS_COLORS: Record<string, string> = {
        draft:     'bg-gray-100 text-gray-700',
        issued:    'bg-blue-100 text-blue-800',
        paid:      'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const getInvoiceCompanyName = (inv: Invoice): string => {
        if (!inv.company) return '—';
        if (typeof inv.company === 'object') return inv.company.name;
        return inv.company;
    };

    // Orders with a populated company object — used for the create-invoice order picker
    const orderOptions = orders.filter(o => o.company && typeof o.company === 'object');

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {(['leads', 'users', 'orders', 'invoices', 'audit'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {t(`dashboard.tabs.${tab}`)}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t(`dashboard.headings.${activeTab}`)}
                    </h2>

                    <div className="flex space-x-2">
                        {activeTab === 'users' && (
                            <button
                                onClick={handleCreateUser}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                                {t('dashboard.buttons.createUser')}
                            </button>
                        )}
                        {activeTab === 'invoices' && (
                            <button
                                onClick={() => setIsCreateInvoiceOpen(true)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                                {t('dashboard.buttons.createInvoice')}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === 'leads') fetchLeads();
                                if (activeTab === 'users') fetchUsers();
                                if (activeTab === 'audit') fetchAuditLogs();
                                if (activeTab === 'orders') fetchOrders();
                                if (activeTab === 'invoices') fetchInvoices();
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 border px-3 py-1 rounded"
                        >
                            {t('common.refresh')}
                        </button>
                    </div>
                </div>

                {/* FILTERS (Orders) */}
                {activeTab === 'orders' && (
                    <div className="mb-6 flex gap-3">
                        <select
                            value={orderStatusFilter}
                            onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus | '')}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">{t('leads.filters.allStatuses')}</option>
                            <option value="pending">{t('orderStatus.pending')}</option>
                            <option value="approved">{t('orderStatus.approved')}</option>
                            <option value="shipped">{t('orderStatus.shipped')}</option>
                            <option value="completed">{t('orderStatus.completed')}</option>
                            <option value="cancelled">{t('orderStatus.cancelled')}</option>
                        </select>
                    </div>
                )}

                {/* FILTERS (Invoices) */}
                {activeTab === 'invoices' && (
                    <div className="mb-6 flex gap-3">
                        <select
                            value={invoiceStatusFilter}
                            onChange={(e) => setInvoiceStatusFilter(e.target.value as InvoiceStatus | '')}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">{t('leads.filters.allStatuses')}</option>
                            <option value="draft">{t('invoiceStatus.draft')}</option>
                            <option value="issued">{t('invoiceStatus.issued')}</option>
                            <option value="paid">{t('invoiceStatus.paid')}</option>
                            <option value="cancelled">{t('invoiceStatus.cancelled')}</option>
                        </select>
                    </div>
                )}

                {/* FILTERS (Leads Only) */}
                {activeTab === 'leads' && (
                    <div className="mb-6 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow max-w-md">
                            <input
                                type="text"
                                placeholder={t('leads.filters.searchPlaceholder')}
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
                            <option value="">{t('leads.filters.allStatuses')}</option>
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
                        <select
                            value={agentFilter}
                            onChange={(e) => setAgentFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">{t('leads.filters.allAgents')}</option>
                            {users.filter(u => u.role === 'agent').map(agent => (
                                <option key={agent._id} value={agent._id}>
                                    {agent.name || agent.email}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8 text-gray-500">{t('common.loadingData')}</div>
                ) : (
                    <>
                        {/* LEADS TABLE */}
                        {activeTab === 'leads' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('leads.table.name')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('leads.table.status')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('leads.table.count')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('leads.table.assignedTo')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('leads.table.lastContact')}</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('leads.table.actions')}</th>
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
                                                                {t(`status.${lead.status}`)}
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
                                                                {t('common.view')}
                                                            </Link>
                                                            <button
                                                                onClick={() => handleEditLead(lead)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                {t('common.edit')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {leads.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">{t('leads.empty')}</td></tr>}
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
                                            {t('common.previous')}
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            {t('common.next')}
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                {t('common.pageOf', { page, total: totalPages })}
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>{t('common.previous')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>{t('common.next')}</span>
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.table.name')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.table.email')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.table.role')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.table.status')}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('users.table.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {users.map((u) => (
                                            <tr key={u._id}>
                                                <td className="px-6 py-4">{u.name || '—'}</td>
                                                <td className="px-6 py-4">{u.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                        {t(`role.${u.role}`)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {u.isActive ? t('users.active') : t('users.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                                    <button onClick={() => handleEditUser(u)} className="text-indigo-600 hover:text-indigo-900">{t('common.edit')}</button>
                                                    <button onClick={() => handleToggleActive(u)} className={`${u.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                                                        {u.isActive ? t('users.deactivate') : t('users.activate')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ORDERS TABLE */}
                        {activeTab === 'orders' && (() => {
                            const filtered = orderStatusFilter
                                ? orders.filter(o => o.status === orderStatusFilter)
                                : orders;
                            return (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.orderId')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.company')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.items')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.amount')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.status')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('orders.table.created')}</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('orders.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filtered.map((order) => (
                                                <tr key={order._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                                                        #{order._id.slice(-6).toUpperCase()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {getOrderCompanyName(order)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {order.items.length} {order.items.length !== 1 ? t('orders.itemsSuffix') : t('orders.itemSuffix')}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        ₪{order.totalAmount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={order.status}
                                                            disabled={savingOrderIds.has(order._id)}
                                                            onChange={(e) => handleOrderStatusChange(order._id, e.target.value as OrderStatus)}
                                                            className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                            <option value="pending">{t('orderStatus.pending')}</option>
                                                            <option value="approved">{t('orderStatus.approved')}</option>
                                                            <option value="shipped">{t('orderStatus.shipped')}</option>
                                                            <option value="completed">{t('orderStatus.completed')}</option>
                                                            <option value="cancelled">{t('orderStatus.cancelled')}</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                        >
                                                            {t('common.view')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">{t('orders.empty')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* INVOICES TABLE */}
                        {activeTab === 'invoices' && (() => {
                            const filtered = invoiceStatusFilter
                                ? invoices.filter(inv => inv.status === invoiceStatusFilter)
                                : invoices;
                            return (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.invoiceNumber')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.company')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.amount')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.status')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.issued')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.due')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.table.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filtered.map((inv) => (
                                                <tr key={inv._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">
                                                        {inv.invoiceNumber}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {getInvoiceCompanyName(inv)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        ₪{inv.totalAmount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={inv.status}
                                                            disabled={savingInvoiceIds.has(inv._id)}
                                                            onChange={(e) => handleInvoiceStatusChange(inv._id, e.target.value as InvoiceStatus)}
                                                            className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                            <option value="draft">{t('invoiceStatus.draft')}</option>
                                                            <option value="issued">{t('invoiceStatus.issued')}</option>
                                                            <option value="paid">{t('invoiceStatus.paid')}</option>
                                                            <option value="cancelled">{t('invoiceStatus.cancelled')}</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        {inv.status === 'draft' && (
                                                            <button
                                                                onClick={() => handleIssueInvoice(inv._id)}
                                                                disabled={issuingInvoiceIds.has(inv._id)}
                                                                className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {issuingInvoiceIds.has(inv._id) ? t('invoices.issuing') : t('invoices.issueAndPdf')}
                                                            </button>
                                                        )}
                                                        {inv.pdfUrl && (
                                                            <a
                                                                href={inv.pdfUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 ml-1"
                                                            >
                                                                {t('invoices.pdf')}
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">{t('invoices.empty')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* AUDIT TABLE */}
                        {activeTab === 'audit' && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.table.date')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.table.user')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.table.action')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.table.entity')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.table.details')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {auditLogs.map((log) => (
                                                <tr key={log._id}>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {log.performedBy?.email || t('audit.system')}
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
                                            {auditLogs.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">{t('audit.empty')}</td></tr>}
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
                                            {t('common.previous')}
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-50 disabled:opacity-50"
                                        >
                                            {t('common.next')}
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                {t('common.pageOf', { page, total: totalPages })}
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>{t('common.previous')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <span>{t('common.next')}</span>
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

            {/* Create Invoice Modal */}
            <Modal
                isOpen={isCreateInvoiceOpen}
                onClose={() => setIsCreateInvoiceOpen(false)}
                title={t('invoices.create.title')}
            >
                <div className="mt-3 space-y-4">
                    {/* Order picker — supplies company ID automatically */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.linkedOrder')} <span className="text-gray-400">{t('invoices.create.linkedOrderHelp')}</span></label>
                        <select
                            value={invoiceForm.orderId}
                            onChange={(e) => {
                                const order = orders.find(o => o._id === e.target.value);
                                const companyId = order && typeof order.company === 'object' ? order.company._id : '';
                                const amount = order ? order.totalAmount.toString() : invoiceForm.totalAmount;
                                setInvoiceForm(f => ({ ...f, orderId: e.target.value, companyId, totalAmount: amount }));
                            }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        >
                            <option value="">{t('invoices.create.selectOrder')}</option>
                            {orderOptions.map(o => (
                                <option key={o._id} value={o._id}>
                                    #{o._id.slice(-6).toUpperCase()} · {getOrderCompanyName(o)} · ₪{o.totalAmount.toLocaleString()}
                                </option>
                            ))}
                        </select>
                        {invoiceForm.companyId && (
                            <p className="text-xs text-green-600 mt-0.5">{t('invoices.create.companyLinked')}</p>
                        )}
                    </div>

                    {/* Invoice number */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.invoiceNumber')} <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            placeholder={t('invoices.create.invoiceNumberPlaceholder')}
                            value={invoiceForm.invoiceNumber}
                            onChange={(e) => setInvoiceForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>

                    {/* Amount + Status row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.totalAmount')} <span className="text-red-400">*</span></label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={invoiceForm.totalAmount}
                                onChange={(e) => setInvoiceForm(f => ({ ...f, totalAmount: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.status')}</label>
                            <select
                                value={invoiceForm.status}
                                onChange={(e) => setInvoiceForm(f => ({ ...f, status: e.target.value as InvoiceStatus }))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                            >
                                <option value="draft">{t('invoiceStatus.draft')}</option>
                                <option value="issued">{t('invoiceStatus.issued')}</option>
                                <option value="paid">{t('invoiceStatus.paid')}</option>
                                <option value="cancelled">{t('invoiceStatus.cancelled')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Due date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.dueDate')} <span className="text-gray-400">{t('common.optional')}</span></label>
                        <input
                            type="date"
                            value={invoiceForm.dueDate}
                            onChange={(e) => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('invoices.create.notes')} <span className="text-gray-400">{t('common.optional')}</span></label>
                        <textarea
                            rows={2}
                            value={invoiceForm.notes}
                            onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => setIsCreateInvoiceOpen(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleCreateInvoice}
                            disabled={invoiceFormSaving}
                            className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded text-sm font-medium"
                        >
                            {invoiceFormSaving ? t('invoices.create.submitting') : t('invoices.create.submit')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <Modal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    title={`${t('orders.detail.titlePrefix')} #${selectedOrder._id.slice(-6).toUpperCase()}`}
                >
                    {/* Meta row */}
                    <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('orders.detail.company')}</p>
                                <p className="font-medium text-gray-900">{getOrderCompanyName(selectedOrder)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('orders.detail.date')}</p>
                                <p className="font-medium text-gray-900">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('orders.detail.status')}</p>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ORDER_STATUS_COLORS[selectedOrder.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {t(`orderStatus.${selectedOrder.status}`)}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('orders.detail.total')}</p>
                                <p className="font-medium text-gray-900">₪{selectedOrder.totalAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mt-4">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('orders.detail.items')}</p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-1 text-left font-medium text-gray-500">{t('orders.detail.product')}</th>
                                        <th className="py-1 text-center font-medium text-gray-500">{t('orders.detail.qty')}</th>
                                        <th className="py-1 text-right font-medium text-gray-500">{t('orders.detail.unitPrice')}</th>
                                        <th className="py-1 text-right font-medium text-gray-500">{t('orders.detail.subtotal')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedOrder.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-1.5 text-gray-900">
                                                {item.productName || item.productType || '—'}
                                            </td>
                                            <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                                            <td className="py-1.5 text-right text-gray-600">
                                                {item.price != null ? `₪${item.price.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">
                                                {item.price != null ? `₪${(item.price * item.quantity).toLocaleString()}` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-200">
                                        <td colSpan={3} className="pt-2 text-right text-sm font-medium text-gray-500">{t('orders.detail.total')}</td>
                                        <td className="pt-2 text-right text-sm font-bold text-gray-900">₪{selectedOrder.totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div className="mt-3">
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('orders.detail.notes')}</p>
                                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">{selectedOrder.notes}</p>
                            </div>
                        )}

                        {/* Close */}
                        <div className="mt-5 pt-3 border-t border-gray-100">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
