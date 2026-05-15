"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Inbox, Users as UsersIcon, ShoppingBag, FileText, Activity, RefreshCw, FilePlus, UserPlus, Building2 } from "lucide-react";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { Button, Card, CardTitle, PageHeader, Tabs, type TabItem } from "@/components/ui";
import LeadEditModal from "@/components/leads/LeadEditModal";
import UserActionModal from "@/components/users/UserActionModal";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TaskList } from "@/components/tasks/TaskList";
import { LeadsTab } from "@/components/dashboard/LeadsTab";
import { CustomersTab } from "@/components/dashboard/CustomersTab";
import { UsersTab } from "@/components/dashboard/UsersTab";
import { OrdersTab } from "@/components/dashboard/OrdersTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";
import { AuditTab } from "@/components/dashboard/AuditTab";
import { OrderDetailModal } from "@/components/dashboard/OrderDetailModal";
import { CreateInvoiceModal, type InvoicePayload } from "@/components/dashboard/CreateInvoiceModal";
import type {
    AuditLog,
    Invoice,
    InvoiceStatus,
    Lead,
    Order,
    OrderStatus,
    User,
} from "@/types";

type TabId = "leads" | "customers" | "users" | "orders" | "invoices" | "audit";

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useAdminI18n();
    const [activeTab, setActiveTab] = useState<TabId>("leads");

    // ── Data ──────────────────────────────────────────────────────────────
    const [leads, setLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);

    // ── Pagination / filters ───────────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");
    const [agentFilter, setAgentFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // ── Tab-specific transient state ───────────────────────────────────────
    const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(new Set());
    const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | "">("");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const [savingInvoiceIds, setSavingInvoiceIds] = useState<Set<string>>(new Set());
    const [issuingInvoiceIds, setIssuingInvoiceIds] = useState<Set<string>>(new Set());
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | "">("");
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

    // ── Modals ────────────────────────────────────────────────────────────
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");

    // ── Fetchers ──────────────────────────────────────────────────────────
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("limit", limit.toString());
            if (statusFilter) params.append("status", statusFilter);
            if (agentFilter) params.append("assignedTo", agentFilter);
            if (searchQuery) params.append("search", searchQuery);
            const response = await api.get(`/leads?${params.toString()}`);
            if (response.data.success && response.data.data) {
                setLeads(response.data.data.leads || []);
                if (response.data.data.pagination) setTotalPages(response.data.data.pagination.pages);
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
            const response = await api.get("/users");
            if (response.data.success || response.data.data) {
                setUsers(response.data.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(`/audit?page=${page}&limit=${limit}`);
            if (response.data.success) {
                setAuditLogs(response.data.data || []);
                if (response.data.pagination) setTotalPages(response.data.pagination.pages);
            }
        } catch (error) {
            console.error(error);
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/orders");
            if (response.data.success) setOrders(response.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error(t("orders.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/invoices");
            if (response.data.success) setInvoices(response.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error(t("invoices.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!user) return;
        if (activeTab === "leads") fetchLeads();
        if (activeTab === "users") fetchUsers();
        if (activeTab === "audit") fetchAuditLogs();
        if (activeTab === "orders") fetchOrders();
        if (activeTab === "invoices") {
            fetchInvoices();
            fetchOrders();
        }
    }, [user, activeTab, fetchLeads, fetchUsers, fetchAuditLogs, fetchOrders, fetchInvoices]);

    // KPI hydration — gather a quick read of all entities once, in the background.
    useEffect(() => {
        if (!user) return;
        // Only run if the active tab does not already cover it.
        if (activeTab !== "users") fetchUsers();
        if (activeTab !== "orders" && activeTab !== "invoices") fetchOrders();
        if (activeTab !== "invoices") fetchInvoices();
        if (activeTab !== "audit") fetchAuditLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, agentFilter, searchQuery, activeTab]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleEditLead = (lead: Lead) => {
        setCurrentLead(lead);
        setIsLeadModalOpen(true);
    };

    const handleSaveLead = async (leadId: string, data: Partial<Lead>) => {
        try {
            await api.patch(`/leads/${leadId}`, data);
            toast.success(t("leads.toasts.updated"));
            fetchLeads();
        } catch (error) {
            console.error(error);
            toast.error(t("leads.toasts.updateFailed"));
        }
    };

    const handleCreateUser = () => {
        setCurrentUser(null);
        setUserModalMode("create");
        setIsUserModalOpen(true);
    };

    const handleEditUser = (u: User) => {
        setCurrentUser(u);
        setUserModalMode("edit");
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
        try {
            if (userModalMode === "create") {
                await api.post("/users", data);
                toast.success(t("users.toasts.created"));
            } else if (currentUser) {
                await api.patch(`/users/${currentUser._id}`, data);
                toast.success(t("users.toasts.updated"));
            }
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error(t("users.toasts.saveFailed"));
        }
    };

    const handleToggleActive = async (u: User) => {
        const confirmMsg = u.isActive ? t("users.confirmToggle") : t("users.confirmActivate");
        if (!confirm(confirmMsg)) return;
        try {
            await api.patch(`/users/${u._id}`, { isActive: !u.isActive });
            toast.success(u.isActive ? t("users.toasts.deactivated") : t("users.toasts.activated"));
            fetchUsers();
        } catch {
            toast.error(t("users.toasts.actionFailed"));
        }
    };

    const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
        setSavingOrderIds((prev) => new Set(prev).add(orderId));
        try {
            await api.patch(`/orders/${orderId}`, { status: newStatus });
            toast.success(t("orders.toasts.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("orders.toasts.updateFailed"));
            fetchOrders();
        } finally {
            setSavingOrderIds((prev) => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    const handleInvoiceStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
        setInvoices((prev) => prev.map((inv) => (inv._id === invoiceId ? { ...inv, status: newStatus } : inv)));
        setSavingInvoiceIds((prev) => new Set(prev).add(invoiceId));
        try {
            await api.patch(`/invoices/${invoiceId}`, { status: newStatus });
            toast.success(t("invoices.toasts.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("invoices.toasts.updateFailed"));
            fetchInvoices();
        } finally {
            setSavingInvoiceIds((prev) => {
                const next = new Set(prev);
                next.delete(invoiceId);
                return next;
            });
        }
    };

    const handleIssueInvoice = async (invoiceId: string) => {
        setIssuingInvoiceIds((prev) => new Set(prev).add(invoiceId));
        try {
            const response = await api.post(`/invoices/${invoiceId}/issue`);
            toast.success(t("invoices.toasts.issued"));
            fetchInvoices();
            const pdfUrl = response.data?.pdfUrl;
            if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer");
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; error?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("invoices.toasts.issueFailed"));
        } finally {
            setIssuingInvoiceIds((prev) => {
                const next = new Set(prev);
                next.delete(invoiceId);
                return next;
            });
        }
    };

    const handleCreateInvoice = async (payload: InvoicePayload) => {
        try {
            await api.post("/invoices", payload);
            toast.success(t("invoices.toasts.created"));
            fetchInvoices();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; error?: string } } };
            toast.error(e.response?.data?.error || e.response?.data?.message || t("invoices.toasts.createFailed"));
            throw err; // let modal know it failed and stay open
        }
    };

    const refresh = () => {
        if (activeTab === "leads") fetchLeads();
        if (activeTab === "users") fetchUsers();
        if (activeTab === "audit") fetchAuditLogs();
        if (activeTab === "orders") fetchOrders();
        if (activeTab === "invoices") fetchInvoices();
    };

    // ── Tabs ──────────────────────────────────────────────────────────────
    const tabs: TabItem<TabId>[] = useMemo(() => [
        { id: "leads", label: t("dashboard.tabs.leads"), icon: <Inbox size={14} /> },
        { id: "customers", label: t("dashboard.tabs.customers"), icon: <Building2 size={14} /> },
        { id: "users", label: t("dashboard.tabs.users"), icon: <UsersIcon size={14} /> },
        { id: "orders", label: t("dashboard.tabs.orders"), icon: <ShoppingBag size={14} /> },
        { id: "invoices", label: t("dashboard.tabs.invoices"), icon: <FileText size={14} /> },
        { id: "audit", label: t("dashboard.tabs.audit"), icon: <Activity size={14} /> },
    ], [t]);

    if (!user) return null;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("dashboard.title")}
                description={t("dashboard.subtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={refresh}>
                            {t("common.refresh")}
                        </Button>
                        {activeTab === "users" && (
                            <Button size="sm" iconStart={<UserPlus size={14} />} onClick={handleCreateUser}>
                                {t("dashboard.buttons.createUser")}
                            </Button>
                        )}
                        {activeTab === "invoices" && (
                            <Button size="sm" iconStart={<FilePlus size={14} />} onClick={() => setIsCreateInvoiceOpen(true)}>
                                {t("dashboard.buttons.createInvoice")}
                            </Button>
                        )}
                    </>
                }
            />

            <KpiGrid leads={leads} users={users} orders={orders} invoices={invoices} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-4">
                    <QuickActions
                        onCreateUser={handleCreateUser}
                        onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
                        onJumpToLeads={() => setActiveTab("leads")}
                    />
                    <Card>
                        <CardTitle>{t("dashboard.myTasks.title")}</CardTitle>
                        <div className="mt-4">
                            <TaskList
                                params={{ assignedTo: "me", status: "open" }}
                                compact
                                limit={6}
                                refreshMs={60_000}
                                viewAllHref="/admin/tasks"
                            />
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2"><RecentActivity logs={auditLogs} /></div>
            </div>

            <div className="space-y-4">
                <Tabs<TabId> items={tabs} value={activeTab} onChange={setActiveTab} />

                {activeTab === "leads" && (
                    <LeadsTab
                        leads={leads}
                        users={users}
                        loading={loading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        agentFilter={agentFilter}
                        onAgentFilterChange={setAgentFilter}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onEdit={handleEditLead}
                    />
                )}
                {activeTab === "customers" && (
                    <CustomersTab agents={users} />
                )}
                {activeTab === "users" && (
                    <UsersTab
                        users={users}
                        loading={loading}
                        onEdit={handleEditUser}
                        onToggle={handleToggleActive}
                    />
                )}
                {activeTab === "orders" && (
                    <OrdersTab
                        orders={orders}
                        loading={loading}
                        statusFilter={orderStatusFilter}
                        onStatusFilterChange={setOrderStatusFilter}
                        onStatusChange={handleOrderStatusChange}
                        savingOrderIds={savingOrderIds}
                        onView={setSelectedOrder}
                    />
                )}
                {activeTab === "invoices" && (
                    <InvoicesTab
                        invoices={invoices}
                        loading={loading}
                        statusFilter={invoiceStatusFilter}
                        onStatusFilterChange={setInvoiceStatusFilter}
                        onStatusChange={handleInvoiceStatusChange}
                        onIssue={handleIssueInvoice}
                        savingInvoiceIds={savingInvoiceIds}
                        issuingInvoiceIds={issuingInvoiceIds}
                    />
                )}
                {activeTab === "audit" && (
                    <AuditTab
                        logs={auditLogs}
                        loading={loading}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                )}
            </div>

            <LeadEditModal
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                lead={currentLead}
                agents={users.filter((u) => u.role === "agent")}
                onSave={handleSaveLead}
            />

            <UserActionModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                mode={userModalMode}
                user={currentUser}
                onSave={handleSaveUser}
            />

            <CreateInvoiceModal
                isOpen={isCreateInvoiceOpen}
                onClose={() => setIsCreateInvoiceOpen(false)}
                orders={orders}
                onCreate={handleCreateInvoice}
            />

            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
    );
}
