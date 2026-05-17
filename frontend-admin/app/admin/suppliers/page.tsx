"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Factory, Plus, RefreshCw, Search } from "lucide-react";
import {
    Badge,
    Button,
    EmptyState,
    Input,
    PageHeader,
    Table,
    TableContainer,
    TableSkeleton,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { SupplierModal } from "@/components/suppliers/SupplierModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { createSupplier, listSuppliers, type SupplierPayload } from "@/lib/opsApi";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
    const { t } = useAdminI18n();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listSuppliers({ search: search.trim() || undefined });
            setSuppliers(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error(t("suppliers.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [search, t]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleCreate = async (payload: SupplierPayload) => {
        try {
            await createSupplier(payload);
            toast.success(t("suppliers.toasts.created"));
            await fetchList();
        } catch (err) {
            throw err;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("suppliers.pageTitle")}
                description={t("suppliers.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchList}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                            {t("suppliers.new")}
                        </Button>
                    </>
                }
            />

            <div className="sm:max-w-sm">
                <Input
                    placeholder={t("suppliers.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    iconStart={<Search size={14} />}
                />
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("suppliers.table.name")}</TH>
                            <TH>{t("suppliers.table.contact")}</TH>
                            <TH>{t("suppliers.table.phone")}</TH>
                            <TH>{t("suppliers.table.status")}</TH>
                            <TH align="end">{t("suppliers.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={5} />
                        ) : suppliers.length === 0 ? (
                            <TR>
                                <TD colSpan={5}>
                                    <EmptyState
                                        icon={<Factory size={18} />}
                                        title={t("suppliers.empty")}
                                        description={t("suppliers.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            suppliers.map((s) => (
                                <TR key={s._id}>
                                    <TD className="font-medium">{s.name}</TD>
                                    <TD muted>{s.contactName || s.email || "—"}</TD>
                                    <TD muted>{s.phone || "—"}</TD>
                                    <TD>
                                        <Badge tone={s.isActive ? "success" : "neutral"}>
                                            {s.isActive ? t("suppliers.active") : t("suppliers.inactive")}
                                        </Badge>
                                    </TD>
                                    <TD align="end">
                                        <Link href={`/admin/suppliers/${s._id}`}>
                                            <Button size="sm" variant="outline">{t("common.view")}</Button>
                                        </Link>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <SupplierModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                supplier={null}
                onSubmit={handleCreate}
            />
        </div>
    );
}
