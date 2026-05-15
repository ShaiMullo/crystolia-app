"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import {
    Button,
    EmptyState,
    Input,
    Pagination,
    Select,
    Table,
    TableContainer,
    TableSkeleton,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { CustomerStatusBadge } from "./StatusBadges";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { listCustomers } from "@/lib/customersApi";
import type { Locale } from "@/i18n";
import type { Customer, CustomerStatus, User } from "@/types";

const CUSTOMER_STATUSES: CustomerStatus[] = ["active", "inactive", "on-hold", "archived"];

interface CustomersTabProps {
    /** Agents available for the assigned-to filter. Optional. */
    agents?: User[];
    /** Optional: lift list state to parent (so dashboard can compute KPIs). */
    onLoaded?: (customers: Customer[]) => void;
}

function companyName(c: Customer): string {
    if (typeof c.company === "object" && c.company) return c.company.name;
    return "—";
}

function agentLabel(c: Customer): string {
    if (!c.assignedTo) return "—";
    if (typeof c.assignedTo === "object") return c.assignedTo.name || c.assignedTo.email;
    return "—";
}

export function CustomersTab({ agents, onLoaded }: CustomersTabProps) {
    const { t, locale } = useAdminI18n();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
    const [agentFilter, setAgentFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listCustomers({
                page,
                limit,
                search: search.trim() || undefined,
                status: statusFilter || undefined,
                assignedTo: agentFilter || undefined,
            });
            setCustomers(res.data || []);
            setTotalPages(res.pagination?.pages || 1);
            onLoaded?.(res.data || []);
        } catch (err) {
            console.error(err);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, agentFilter, onLoaded]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, agentFilter]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-grow sm:max-w-sm">
                    <Input
                        placeholder={t("customers.filters.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        iconStart={<Search size={14} />}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | "")}
                        className="sm:w-44"
                    >
                        <option value="">{t("customers.filters.allStatuses")}</option>
                        {CUSTOMER_STATUSES.map((s) => (
                            <option key={s} value={s}>{t(`customerStatus.${s}`)}</option>
                        ))}
                    </Select>
                    {agents && agents.length > 0 && (
                        <Select
                            value={agentFilter}
                            onChange={(e) => setAgentFilter(e.target.value)}
                            className="sm:w-48"
                        >
                            <option value="">{t("customers.filters.allAgents")}</option>
                            {agents.filter((a) => a.role === "agent" || a.role === "admin").map((a) => (
                                <option key={a._id} value={a._id}>{a.name || a.email}</option>
                            ))}
                        </Select>
                    )}
                </div>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("customers.table.company")}</TH>
                            <TH>{t("customers.table.contact")}</TH>
                            <TH>{t("customers.table.status")}</TH>
                            <TH>{t("customers.table.agent")}</TH>
                            <TH align="end">{t("customers.table.orders")}</TH>
                            <TH align="end">{t("customers.table.revenue")}</TH>
                            <TH>{t("customers.table.lastContact")}</TH>
                            <TH align="end">{t("customers.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={8} />
                        ) : customers.length === 0 ? (
                            <TR>
                                <TD colSpan={8}>
                                    <EmptyState
                                        icon={<Users size={18} />}
                                        title={t("customers.empty")}
                                        description={t("customers.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            customers.map((c) => (
                                <TR key={c._id}>
                                    <TD>
                                        <div className="font-medium text-gray-900 dark:text-gray-50">{companyName(c)}</div>
                                        {typeof c.company === "object" && c.company?.vatNumber && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.company.vatNumber}</div>
                                        )}
                                    </TD>
                                    <TD muted>
                                        <div className="text-gray-900 dark:text-gray-100">{c.contactName || "—"}</div>
                                        {c.contactPhone && <div className="text-xs text-gray-400">{c.contactPhone}</div>}
                                    </TD>
                                    <TD><CustomerStatusBadge status={c.status} /></TD>
                                    <TD muted>{agentLabel(c)}</TD>
                                    <TD align="end" muted className="tabular">{formatNumber(c.totalOrders, locale as Locale)}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(c.totalRevenue || 0, "ILS", locale as Locale)}
                                    </TD>
                                    <TD muted>{formatDate(c.lastContactAt, locale as Locale)}</TD>
                                    <TD align="end">
                                        <Link href={`/admin/customers/${c._id}`}>
                                            <Button size="sm" variant="outline">{t("common.view")}</Button>
                                        </Link>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}
