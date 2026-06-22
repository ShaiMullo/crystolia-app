"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, Input, PageHeader, Pagination, Select, Tabs, type TabItem } from "@/components/ui";
import { OperationalError } from "@/components/system/OperationalError";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { listUsers, type AdminUser, type UsersPagination, type UserRole } from "@/lib/usersApi";
import { UsersTable } from "@/components/users/UsersTable";

type TabId = Extract<UserRole, "admin" | "agent" | "customer">;
type StatusFilter = "" | "active" | "inactive";

const LIMIT = 25;

export default function UsersPage() {
    const { t } = useAdminI18n();

    const [tab, setTab] = useState<TabId>("admin");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("");
    const [company, setCompany] = useState("");
    const [page, setPage] = useState(1);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [pagination, setPagination] = useState<UsersPagination | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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

    // Best-effort company options for the Customers tab: distinct companies in
    // the loaded customer users. Hidden when none are present.
    const companyOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const u of users) {
            if (u.company && typeof u.company === "object") m.set(u.company._id, u.company.name);
        }
        return [...m.entries()].map(([id, name]) => ({ id, name }));
    }, [users]);

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

    return (
        <div className="space-y-6">
            <PageHeader title={t("users.page.title")} description={t("users.page.subtitle")} />

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
                </Select>

                {tab === "customer" && companyOptions.length > 0 && (
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
                        {companyOptions.map((c) => (
                            <option key={c.id} value={c.id}>
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
                    <UsersTable users={users} loading={loading} />
                    {pagination && pagination.pages > 1 && (
                        <div className="px-4 py-3">
                            <Pagination
                                page={pagination.page}
                                totalPages={pagination.pages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
