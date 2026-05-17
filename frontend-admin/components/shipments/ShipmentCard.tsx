"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Truck, Plus } from "lucide-react";
import {
    Button,
    Card,
    CardTitle,
    EmptyState,
    Field,
    Input,
    Modal,
    Select,
    Spinner,
} from "@/components/ui";
import { ShipmentStatusBadge } from "@/components/dashboard/StatusBadges";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import { createShipment, listShipments, updateShipment } from "@/lib/opsApi";
import type { Locale } from "@/i18n";
import type { ShipmentRecord, ShipmentStatus } from "@/types";

const STATUSES: ShipmentStatus[] = ["pending", "shipped", "in_transit", "delivered", "cancelled"];

export function ShipmentCard({ orderId }: { orderId: string }) {
    const { t, locale } = useAdminI18n();
    const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [courier, setCourier] = useState("");
    const [tracking, setTracking] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchShipments = useCallback(async () => {
        try {
            const data = await listShipments(orderId);
            setShipments(data || []);
        } catch {
            setShipments([]);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchShipments();
    }, [fetchShipments]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            await createShipment({ orderId, courier: courier.trim() || undefined, trackingNumber: tracking.trim() || undefined });
            toast.success(t("shipments.toasts.created"));
            setModalOpen(false);
            setCourier("");
            setTracking("");
            await fetchShipments();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || t("shipments.toasts.createFailed"));
        } finally {
            setSaving(false);
        }
    };

    const handleStatus = async (shipment: ShipmentRecord, status: ShipmentStatus) => {
        setBusyId(shipment._id);
        try {
            await updateShipment(shipment._id, { status });
            toast.success(t("shipments.toasts.updated"));
            await fetchShipments();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            toast.error(e.response?.data?.error || t("shipments.toasts.updateFailed"));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card>
            <div className="flex items-center justify-between gap-3">
                <CardTitle>{t("shipments.title")}</CardTitle>
                <Button size="sm" variant="outline" iconStart={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                    {t("shipments.new")}
                </Button>
            </div>

            <div className="mt-3">
                {loading ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                ) : shipments.length === 0 ? (
                    <EmptyState icon={<Truck size={18} />} title={t("shipments.empty")} className="!py-6" />
                ) : (
                    <ul className="space-y-3">
                        {shipments.map((s) => (
                            <li key={s._id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <ShipmentStatusBadge status={s.status} />
                                    <Select
                                        pill
                                        value={s.status}
                                        disabled={busyId === s._id}
                                        onChange={(e) => handleStatus(s, e.target.value as ShipmentStatus)}
                                        className="!h-6 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                    >
                                        {STATUSES.map((st) => (
                                            <option key={st} value={st}>{t(`shipments.status.${st}`)}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                    {s.courier && <p>{t("shipments.courier")}: <span className="text-gray-700 dark:text-gray-200">{s.courier}</span></p>}
                                    {s.trackingNumber && <p>{t("shipments.tracking")}: <span className="font-mono text-gray-700 dark:text-gray-200">{s.trackingNumber}</span></p>}
                                    {s.shippedAt && <p>{t("shipments.shippedAt")}: {formatDateTime(s.shippedAt, locale as Locale)}</p>}
                                    {s.deliveredAt && <p>{t("shipments.deliveredAt")}: {formatDateTime(s.deliveredAt, locale as Locale)}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                size="sm"
                title={t("shipments.modal.title")}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>{t("common.cancel")}</Button>
                        <Button onClick={handleCreate} loading={saving}>{t("common.create")}</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Field label={t("shipments.courier")}>
                        <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={t("shipments.modal.courierPlaceholder")} />
                    </Field>
                    <Field label={t("shipments.tracking")}>
                        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
                    </Field>
                </div>
            </Modal>
        </Card>
    );
}
