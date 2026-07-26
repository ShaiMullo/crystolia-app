"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Card, Input, PageHeader, Pagination, Select, Tabs, type TabItem } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperationalError } from "@/components/system/OperationalError";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/app/context/AuthContext";
import { useMutationRunner } from "@/lib/useMutationRunner";
import {
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    type AdminUser,
    type CreateUserPayload,
    type UpdateUserPayload,
    type UsersPagination,
    type UserRole,
} from "@/lib/usersApi";
import { listCompanies, type Company } from "@/lib/companiesApi";
import { UsersTable } from "@/components/users/UsersTable";
import { UserFormModal, type UserFormMode } from "@/components/users/UserFormModal";
import { ResetPasswordModal } from "@/components/users/ResetPasswordModal";

type TabId = Extract<UserRole, "admin" | "agent" | "customer">;
type StatusFilter = "" | "active" | "inactive" | "pending";

const LIMIT = 25;

export default function UsersPage() {
    const { t } = useAdminI18n();
    const { user: currentUser } = useAuth();

    // Publicly registered accounts are customers, so open on the list the
    // administrator most often needs to review/manage. Staff remain available
    // in the adjacent Admins and Employees tabs.
    const [tab, setTab] = useState<TabId>("customer");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("");
    const [company, setCompany] = useState("");
    const [page, setPage] = useState(1);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [pagination, setPagination] = useState<UsersPagination | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [companies, setCompanies] = useState<Company[]>([]);

    // ── Modal / dialog state ─────────────────────────────────────────────────
    const [formMode, setFormMode] = useState<UserFormMode | null>(null);
    const [formUser, setFormUser] = useState<AdminUser | null>(null);
    const [resetUser, setResetUser] = useState<AdminUser | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{ kind: "toggle" | "delete"; user: AdminUser } | null>(null);

    const { run, busy } = useMutationRunner();

    // Debounce the search box → `search`, and reset to page 1.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await listUsers({
                role: tab,
                status: status || undefined,
                search: search || undefined,
                company: company || undefined,
                page,
                limit: LIMIT,
            });
            setUsers(res.data);
            setPagination(res.pagination);
        } catch {
            setError(true);
            setUsers([]);
            setPagination(undefined);
        } finally {
            setLoading(false);
        }
    }, [tab, status, search, company, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Load the company directory once (for the customer filter + the form's picker).
    useEffect(() => {
        listCompanies()
            .then((res) => setCompanies(res.data))
            .catch(() => setCompanies([]));
    }, []);

    const tabs: TabItem<TabId>[] = [
        { id: "admin", label: t("users.tabs.admins") },
        { id: "agent", label: t("users.tabs.employees") },
        { id: "customer", label: t("users.tabs.customers") },
    ];

    const onTabChange = (id: TabId) => {
        setTab(id);
        setPage(1);
        setCompany(""); // company filter only applies to the Customers tab
    };

    // ── Open handlers ────────────────────────────────────────────────────────
    const openCreate = () => {
        setFormUser(null);
        setFormMode("create");
    };
    const openEdit = (u: AdminUser) => {
        setFormUser(u);
        setFormMode("edit");
    };
    const openView = (u: AdminUser) => {
        setFormUser(u);
        setFormMode("view");
    };
    const closeForm = () => {
        setFormMode(null);
        setFormUser(null);
    };

    const openReset = (u: AdminUser) => {
        setResetUser(u);
        setTempPassword(null);
    };
    const closeReset = () => {
        setResetUser(null);
        setTempPassword(null);
    };

    const closeConfirm = () => setConfirmState(null);

    // ── Mutations (all via the generic runner) ───────────────────────────────
    const submitForm = (payload: CreateUserPayload | UpdateUserPayload) => {
        if (formMode === "create") {
            run({
                request: () => createUser(payload as CreateUserPayload),
                successMessage: t("users.toasts.created"),
                errorMessage: t("users.toasts.saveFailed"),
                onSuccess: () => {
                    closeForm();
                    fetchUsers();
                },
            });
        } else if (formMode === "edit" && formUser) {
            run({
                request: () => updateUser(formUser._id, payload as UpdateUserPayload),
                successMessage: t("users.toasts.updated"),
                errorMessage: t("users.toasts.saveFailed"),
                onSuccess: () => {
                    closeForm();
                    fetchUsers();
                },
            });
        }
    };

    const confirmReset = () => {
        if (!resetUser) return;
        run({
            request: () => resetUserPassword(resetUser._id),
            successMessage: t("users.toasts.passwordReset"),
            errorMessage: t("users.toasts.resetFailed"),
            // Stay open and switch to the reveal phase; nothing list-visible changed.
            onSuccess: (data) => setTempPassword(data.tempPassword),
        });
    };

    const runConfirm = () => {
        if (!confirmState) return;
        const { kind, user } = confirmState;
        if (kind === "delete") {
            run({
                request: () => deleteUser(user._id),
                successMessage: t("users.toasts.deleted"),
                errorMessage: t("users.toasts.deleteFailed"),
                onSuccess: () => {
                    closeConfirm();
                    fetchUsers();
                },
            });
        } else {
            run({
                request: () => updateUser(user._id, { isActive: !user.isActive }),
                successMessage: user.registrationStatus === "pending"
                    ? t("users.toasts.approved")
                    : user.isActive
                        ? t("users.toasts.deactivated")
                        : t("users.toasts.activated"),
                errorMessage: t("users.toasts.actionFailed"),
                onSuccess: () => {
                    closeConfirm();
                    fetchUsers();
                },
            });
        }
    };

    // ── Confirm dialog copy (derived) ────────────────────────────────────────
    const confirmCopy = (() => {
        if (!confirmState) return null;
        const name = confirmState.user.name || confirmState.user.email;
        if (confirmState.kind === "delete") {
            return {
                title: t("users.confirm.deleteTitle"),
                message: t("users.confirm.deleteMessage", { name }),
                confirmLabel: t("common.delete"),
                variant: "danger" as const,
            };
        }
        if (confirmState.user.registrationStatus === "pending") {
            return {
                title: t("users.confirm.approveTitle"),
                message: t("users.confirm.approveMessage", { name }),
                confirmLabel: t("users.approve"),
                variant: "success" as const,
            };
        }
        return confirmState.user.isActive
            ? {
                  title: t("users.confirm.deactivateTitle"),
                  message: t("users.confirm.deactivateMessage", { name }),
                  confirmLabel: t("users.deactivate"),
                  variant: "danger" as const,
              }
            : {
                  title: t("users.confirm.activateTitle"),
                  message: t("users.confirm.activateMessage", { name }),
                  confirmLabel: t("users.activate"),
                  variant: "success" as const,
              };
    })();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("users.page.title")}
                description={t("users.page.subtitle")}
                actions={
                    <Button onClick={openCreate} iconStart={<Plus size={16} />}>
                        {t("users.newUser")}
                    </Button>
                }
            />

            <Tabs items={tabs} value={tab} onChange={onTabChange} />

            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:max-w-xs sm:flex-1">
                    <Search size={15} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 start-3" />
                    <Input
                        type="search"
                        className="ps-9"
                        placeholder={t("users.search.placeholder")}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>

                <Select
                    className="sm:w-44"
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value as StatusFilter);
                        setPage(1);
                    }}
                    aria-label={t("users.filters.status")}
                >
                    <option value="">{t("users.filters.statusAll")}</option>
                    <option value="active">{t("users.filters.statusActive")}</option>
                    <option value="inactive">{t("users.filters.statusInactive")}</option>
                    <option value="pending">{t("users.filters.statusPending")}</option>
                </Select>

                {tab === "customer" && companies.length > 0 && (
                    <Select
                        className="sm:w-56"
                        value={company}
                        onChange={(e) => {
                            setCompany(e.target.value);
                            setPage(1);
                        }}
                        aria-label={t("users.filters.company")}
                    >
                        <option value="">{t("users.filters.companyAll")}</option>
                        {companies.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                )}
            </div>

            {error ? (
                <OperationalError service="users.list" onRetry={fetchUsers} />
            ) : (
                <Card padded={false}>
                    <UsersTable
                        users={users}
                        loading={loading}
                        currentUserId={currentUser?._id}
                        onView={openView}
                        onEdit={openEdit}
                        onResetPassword={openReset}
                        onToggleActive={(u) => setConfirmState({ kind: "toggle", user: u })}
                        onDelete={(u) => setConfirmState({ kind: "delete", user: u })}
                    />
                    {pagination && pagination.pages > 1 && (
                        <div className="px-4 py-3">
                            <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
                        </div>
                    )}
                </Card>
            )}

            {/* Create / Edit / View — mounted per-open and keyed by user (clean state). */}
            {formMode && (
                <UserFormModal
                    key={`${formMode}:${formUser?._id ?? "new"}`}
                    isOpen
                    mode={formMode}
                    user={formUser}
                    defaultRole={tab}
                    companies={companies}
                    loading={busy}
                    onClose={closeForm}
                    onSubmit={submitForm}
                />
            )}

            {resetUser && (
                <ResetPasswordModal
                    isOpen
                    userName={resetUser.name || resetUser.email}
                    tempPassword={tempPassword}
                    loading={busy}
                    onClose={closeReset}
                    onConfirm={confirmReset}
                />
            )}

            {confirmState && confirmCopy && (
                <ConfirmDialog
                    isOpen
                    onClose={closeConfirm}
                    onConfirm={runConfirm}
                    loading={busy}
                    title={confirmCopy.title}
                    message={confirmCopy.message}
                    confirmLabel={confirmCopy.confirmLabel}
                    confirmVariant={confirmCopy.variant}
                />
            )}
        </div>
    );
}
