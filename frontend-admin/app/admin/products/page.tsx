"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Package, Plus, RefreshCw, Search } from "lucide-react";
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
import { ProductModal } from "@/components/products/ProductModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency } from "@/lib/format";
import { createProduct, deleteProduct, listProducts, updateProduct, type ProductPayload } from "@/lib/inventoryApi";
import type { Locale } from "@/i18n";
import type { Product } from "@/types";

export default function ProductsPage() {
    const { t, locale } = useAdminI18n();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listProducts({ search: search.trim() || undefined, limit: 200 });
            setProducts(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error(t("products.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [search, t]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (p: Product) => {
        setEditing(p);
        setModalOpen(true);
    };

    const handleSubmit = async (payload: ProductPayload) => {
        try {
            if (editing) {
                await updateProduct(editing._id, payload);
                toast.success(t("products.toasts.updated"));
            } else {
                await createProduct(payload);
                toast.success(t("products.toasts.created"));
            }
            await fetchList();
        } catch (err) {
            throw err;
        }
    };

    const handleDelete = async (p: Product) => {
        if (!confirm(t("products.confirmDelete", { name: p.name }))) return;
        try {
            await deleteProduct(p._id);
            toast.success(t("products.toasts.deleted"));
            await fetchList();
        } catch {
            toast.error(t("products.toasts.deleteFailed"));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("products.pageTitle")}
                description={t("products.pageSubtitle")}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<RefreshCw size={14} />} onClick={fetchList}>
                            {t("common.refresh")}
                        </Button>
                        <Button size="sm" iconStart={<Plus size={14} />} onClick={openCreate}>
                            {t("products.new")}
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-grow sm:max-w-sm">
                    <Input
                        placeholder={t("products.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        iconStart={<Search size={14} />}
                    />
                </div>
            </div>

            <TableContainer>
                <Table>
                    <THead>
                        <TR>
                            <TH>{t("products.table.name")}</TH>
                            <TH>{t("products.table.sku")}</TH>
                            <TH>{t("products.table.category")}</TH>
                            <TH align="end">{t("products.table.price")}</TH>
                            <TH align="center">{t("products.table.tax")}</TH>
                            <TH align="center">{t("products.table.tracking")}</TH>
                            <TH>{t("products.table.status")}</TH>
                            <TH align="end">{t("products.table.actions")}</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TableSkeleton columns={8} />
                        ) : products.length === 0 ? (
                            <TR>
                                <TD colSpan={8}>
                                    <EmptyState
                                        icon={<Package size={18} />}
                                        title={t("products.empty")}
                                        description={t("products.emptyHint")}
                                        action={
                                            <Button size="sm" iconStart={<Plus size={14} />} onClick={openCreate}>
                                                {t("products.new")}
                                            </Button>
                                        }
                                    />
                                </TD>
                            </TR>
                        ) : (
                            products.map((p) => (
                                <TR key={p._id}>
                                    <TD>
                                        <div className="font-medium text-gray-900 dark:text-gray-50">{p.name}</div>
                                        {p.description && (
                                            <div className="text-xs text-gray-400 line-clamp-1">{p.description}</div>
                                        )}
                                    </TD>
                                    <TD muted className="font-mono">{p.sku}</TD>
                                    <TD muted>{p.category || "—"}</TD>
                                    <TD align="end" className="tabular font-medium">
                                        {formatCurrency(p.price, p.currency || "ILS", locale as Locale)}
                                        <span className="ms-1 text-xs text-gray-400">/ {t(`products.units.${p.unit}`)}</span>
                                    </TD>
                                    <TD align="center" muted className="tabular">{p.taxRate}%</TD>
                                    <TD align="center">
                                        <Badge tone={p.stockTrackingEnabled ? "info" : "neutral"}>
                                            {p.stockTrackingEnabled ? t("common.yes") : t("common.no")}
                                        </Badge>
                                    </TD>
                                    <TD>
                                        <Badge tone={p.isActive ? "success" : "neutral"}>
                                            {p.isActive ? t("products.active") : t("products.inactive")}
                                        </Badge>
                                    </TD>
                                    <TD align="end">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                                                {t("common.edit")}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(p)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                {t("common.delete")}
                                            </Button>
                                        </div>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </TableContainer>

            <ProductModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                product={editing}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
