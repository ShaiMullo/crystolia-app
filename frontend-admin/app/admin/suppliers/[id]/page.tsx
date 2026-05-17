"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Pencil, Package, Factory } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
    Badge,
    Button,
    Card,
    CardTitle,
    EmptyState,
    Input,
    LoadingState,
    PageHeader,
    Table,
    TableContainer,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
import { SupplierModal } from "@/components/suppliers/SupplierModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSupplier, updateSupplier, type SupplierPayload } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { SupplierDetail } from "@/types";

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();
    const supplierId = params?.id as string;

    const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const fetchSupplier = useCallback(async () => {
        if (!supplierId) return;
        try {
            setSupplier(await getSupplier(supplierId));
        } catch (err) {
            console.error(err);
            toast.error(t("suppliers.toasts.loadFailed"));
        } finally {
            setLoading(false);
        }
    }, [supplierId, t]);

    useEffect(() => {
        if (user) fetchSupplier();
    }, [user, fetchSupplier]);

    const handleEdit = async (payload: SupplierPayload) => {
        if (!supplier) return;
        try {
            await updateSupplier(supplier._id, payload);
            toast.success(t("suppliers.toasts.updated"));
            await fetchSupplier();
        } catch (err) {
            throw err;
        }
    };

    const handleAddNote = async () => {
        if (!supplier || !noteText.trim()) return;
        setSavingNote(true);
        try {
            await updateSupplier(supplier._id, { note: noteText.trim() });
            toast.success(t("suppliers.toasts.noteAdded"));
            setNoteText("");
            await fetchSupplier();
        } catch {
            toast.error(t("suppliers.toasts.updateFailed"));
        } finally {
            setSavingNote(false);
        }
    };

    if (loading) return <LoadingState label={t("suppliers.detail.loading")} />;

    if (!supplier) {
        return (
            <EmptyState
                icon={<Factory size={18} />}
                title={t("suppliers.detail.notFound")}
                action={
                    <Button variant="outline" onClick={() => router.push("/admin/suppliers")} iconStart={<ArrowLeft size={14} />}>
                        {t("common.back")}
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={supplier.name}
                description={supplier.contactName || supplier.email}
                actions={
                    <>
                        <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />} onClick={() => router.push("/admin/suppliers")}>
                            {t("suppliers.detail.back")}
                        </Button>
                        <Button size="sm" iconStart={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
                            {t("common.edit")}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <CardTitle>{t("suppliers.detail.info")}</CardTitle>
                        <dl className="mt-3 space-y-2 text-sm">
                            {[
                                [t("suppliers.fields.contactName"), supplier.contactName],
                                [t("suppliers.fields.email"), supplier.email],
                                [t("suppliers.fields.phone"), supplier.phone],
                                [t("suppliers.fields.vatNumber"), supplier.vatNumber],
                                [t("suppliers.fields.city"), supplier.city],
                                [t("suppliers.fields.address"), supplier.address],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-baseline gap-2">
                                    <dt className="text-xs uppercase tracking-wide text-gray-400 min-w-[6rem]">{label}</dt>
                                    <dd className="text-sm text-gray-700 dark:text-gray-200">{value || "—"}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>

                    <Card>
                        <CardTitle>{t("suppliers.detail.notes")}</CardTitle>
                        <div className="mt-3 flex items-center gap-2">
                            <Input
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder={t("suppliers.detail.notePlaceholder")}
                                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                            />
                            <Button variant="success" onClick={handleAddNote} loading={savingNote}>
                                {t("common.add")}
                            </Button>
                        </div>
                        {supplier.notes.length > 0 ? (
                            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pe-1">
                                {[...supplier.notes].reverse().map((n, i) => (
                                    <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2.5">
                                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{n.text}</p>
                                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt, locale as Locale)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-gray-400">{t("suppliers.detail.notesEmpty")}</p>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardTitle>{t("suppliers.detail.products")}</CardTitle>
                        <div className="mt-3">
                            {supplier.products.length === 0 ? (
                                <EmptyState icon={<Package size={18} />} title={t("suppliers.detail.productsEmpty")} />
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <THead>
                                            <TR>
                                                <TH>{t("suppliers.detail.product")}</TH>
                                                <TH>{t("suppliers.detail.sku")}</TH>
                                                <TH align="end">{t("suppliers.detail.price")}</TH>
                                                <TH align="end">{t("suppliers.detail.cost")}</TH>
                                                <TH>{t("suppliers.detail.status")}</TH>
                                            </TR>
                                        </THead>
                                        <TBody>
                                            {supplier.products.map((p) => (
                                                <TR key={p._id}>
                                                    <TD className="font-medium">{p.name}</TD>
                                                    <TD muted className="font-mono">{p.sku}</TD>
                                                    <TD align="end" className="tabular">{formatCurrency(p.price, "ILS", locale as Locale)}</TD>
                                                    <TD align="end" className="tabular" muted>
                                                        {p.costPrice != null ? formatCurrency(p.costPrice, "ILS", locale as Locale) : "—"}
                                                    </TD>
                                                    <TD>
                                                        <Badge tone={p.isActive ? "success" : "neutral"}>
                                                            {p.isActive ? t("suppliers.active") : t("suppliers.inactive")}
                                                        </Badge>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </TBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <SupplierModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                supplier={supplier}
                onSubmit={handleEdit}
            />
        </div>
    );
}
