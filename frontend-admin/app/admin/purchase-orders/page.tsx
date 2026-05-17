"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Plus, RefreshCw, PackageOpen } from "lucide-react";
import {
    Button,
    EmptyState,
    Pagination,
    PageHeader,
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
import { PurchaseOrderStatusBadge } from "@/components/dashboard/StatusBadges";
import { PurchaseOrderModal } from "@/components/purchaseOrders/PurchaseOrderModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import { createPurchaseOrder, listPurchaseOrders, listSuppliers, type PurchaseOrderPayload } from "@/lib/opsApi";
import { listProducts } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { Product, PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/types";

const STATUSES: PurchaseOrderStatus[] = ["draft", "ordered", "partially_received", "received", "cancelled"];

function supplierName(po: PurchaseOrder): string {
    return typeof po.supplier === "object" && po.supplier ? po.supplier.name : "—";
}

export default function PurchaseOrdersPage() {
    const { t, locale } = useAdminI18n();
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "">("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const fetchPos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listPurchaseOrders({ page, status: statusFilter || undefined });
            setPos(res.data || []);
            setTotalPages(res.pagination?.pages || 1);
        } catch (err) {
            console.error(err);
            toast.error(t("purchaseOrders.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, t]);

    useEffect(() => {
        fetchPos();
    }, [fetchPos]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [s, p] = await Promise.all([
                    listSuppliers({ page: 1 }),
                    listProducts({ limit: 200, isActive: true }),
                ]);
                if (cancelled) return;
                setSuppliers(s.data || []);
                setProducts(p.data || []);
            } catch {
                // non-fatal
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleCreate = async (payload: PurchaseOrderPayload) => {
        try {
            await createPurchaseOrder(payload);
            toast.success(t("purchaseOrders.toasts.created"));
            await fetchPos();
        } catch (err) {
            throw err;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("purchaseOrders.pageTitle")}
                description={t("purchaseOrders.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchPos}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                            {t("purchaseOrders.new")}
                        </Button>
                    </>
                }
            />

            <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "")}
                className="sm:w-52"
            >
                <option value="">{t("purchaseOrders.filters.allStatuses")}</option>
                {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`purchaseOrders.status.${s}`)}</option>
                ))}
            </Select>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("purchaseOrders.table.poNumber")}</TH>
                            <TH>{t("purchaseOrders.table.supplier")}</TH>
                            <TH align="center">{t("purchaseOrders.table.items")}</TH>
                            <TH align="end">{t("purchaseOrders.table.total")}</TH>
                            <TH>{t("purchaseOrders.table.status")}</TH>
                            <TH>{t("purchaseOrders.table.created")}</TH>
                            <TH align="end">{t("purchaseOrders.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={7} />
                        ) : pos.length === 0 ? (
                            <TR>
                                <TD colSpan={7}>
                                    <EmptyState
                                        icon={<PackageOpen size={18} />}
                                        title={t("purchaseOrders.empty")}
                                        description={t("purchaseOrders.emptyHint")}
                                    />
                                </TD>
                            </TR>
                        ) : (
                            pos.map((po) => (
                                <TR key={po._id}>
                                    <TD className="font-mono font-medium">{po.poNumber}</TD>
                                    <TD>{supplierName(po)}</TD>
                                    <TD align="center" muted className="tabular">{po.items.length}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(po.totalCost, "ILS", locale as Locale)}
                                    </TD>
                                    <TD><PurchaseOrderStatusBadge status={po.status} /></TD>
                                    <TD muted>{formatDate(po.createdAt, locale as Locale)}</TD>
                                    <TD align="end">
                                        <Link href={`/admin/purchase-orders/${po._id}`}>
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

            <PurchaseOrderModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                suppliers={suppliers}
                products={products}
                onSubmit={handleCreate}
            />
        </div>
    );
}
