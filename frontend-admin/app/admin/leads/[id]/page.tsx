"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, MessageCircle, MessageSquare, Activity, FileText, Phone, Send } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import api from "@/app/lib/api";
import {
    Button,
    Card,
    CardTitle,
    EmptyState,
    Field,
    Input,
    LoadingState,
    PageHeader,
    Select,
} from "@/components/ui";
import { LeadStatusBadge } from "@/components/dashboard/StatusBadges";
import { Lead, LeadStatus, TimelineEvent, LeadNote } from "@/types";
import ConvertLeadModal, { ConvertSubmitPayload, ConvertSubmitResult } from "@/components/leads/ConvertLeadModal";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n";

const STATUS_OPTIONS: LeadStatus[] = [
    "new", "contacted", "qualified", "proposal", "won", "lost", "converted", "closed", "archived", "re-engaged",
];

function whatsappPhone(phone: string): string {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("05")) digits = `972${digits.slice(1)}`;
    return digits;
}

function dialPhone(phone: string): string {
    return phone.replace(/[^\d+]/g, "");
}

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { t, locale } = useAdminI18n();

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [noteText, setNoteText] = useState("");
    const [newStatus, setNewStatus] = useState<LeadStatus>("new");
    const [assignOwner, setAssignOwner] = useState("");
    const [isConvertOpen, setIsConvertOpen] = useState(false);

    const leadId = params?.id as string;

    const fetchLead = useCallback(async () => {
        if (!leadId) return;
        try {
            const res = await api.get(`/crm/leads/${leadId}`);
            // CRM detail returns { success, lead }; keep the data fallback for
            // compatibility with versioned response envelopes.
            const data = res.data.lead || res.data.data || res.data;
            setLead(data);
            setNewStatus(data.status);
            setAssignOwner(data.ownerId || "");
        } catch (err) {
            toast.error(t("leadDetail.toasts.loadFailed"));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [leadId, t]);

    useEffect(() => {
        if (user) fetchLead();
    }, [fetchLead, user]);

    const handleStatusChange = async () => {
        if (!lead || newStatus === lead.status) return;
        try {
            await api.patch(`/crm/leads/${leadId}/status`, { status: newStatus });
            toast.success(t("leadDetail.toasts.statusUpdated", { status: t(`status.${newStatus}`) }));
            fetchLead();
        } catch {
            toast.error(t("leadDetail.toasts.statusFailed"));
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            await api.post(`/crm/leads/${leadId}/notes`, { text: noteText });
            toast.success(t("leadDetail.toasts.noteAdded"));
            setNoteText("");
            fetchLead();
        } catch {
            toast.error(t("leadDetail.toasts.noteFailed"));
        }
    };

    const handleAssign = async () => {
        if (!assignOwner.trim()) return;
        try {
            await api.patch(`/crm/leads/${leadId}/assign`, { ownerId: assignOwner });
            toast.success(t("leadDetail.toasts.ownerAssigned"));
            fetchLead();
        } catch {
            toast.error(t("leadDetail.toasts.ownerFailed"));
        }
    };

    const handleConvertSubmit = useCallback(
        async (payload: ConvertSubmitPayload): Promise<ConvertSubmitResult> => {
            const res = await api.post(`/crm/leads/${leadId}/convert`, payload);
            const data = res.data;
            if (data.idempotent) {
                toast(t("leadDetail.toasts.alreadyConverted"), { icon: "ℹ️" });
            } else {
                toast.success(t("leadDetail.toasts.converted"));
            }
            return {
                success: !!data.success,
                idempotent: !!data.idempotent,
                company: data.company || null,
                user: data.user || null,
                tempPassword: data.tempPassword,
            };
        },
        [leadId, t],
    );

    const isConverted = !!lead && (lead.status === "converted" || !!lead.convertedToCompanyId);

    if (loading) {
        return <LoadingState label={t("leadDetail.states.loading")} />;
    }

    if (!lead) {
        return (
            <EmptyState
                icon={<FileText size={18} />}
                title={t("leadDetail.states.notFound")}
                action={
                    <Button variant="outline" onClick={() => router.push("/admin")} iconStart={<ArrowLeft size={14} />}>
                        {t("common.back")}
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={lead.name}
                description={`${lead.phone} · ${lead.email || t("leadDetail.noEmail")}`}
                actions={
                    <>
                        <Button
                            variant="outline"
                            iconStart={<Phone size={16} />}
                            className="min-h-11"
                            onClick={() => window.location.assign(`tel:${dialPhone(lead.phone)}`)}
                        >
                            {t("leadDetail.actions.call")}
                        </Button>
                        <Button
                            variant="outline"
                            iconStart={<Send size={16} />}
                            className="min-h-11"
                            onClick={() => window.location.assign(`sms:${dialPhone(lead.phone)}`)}
                        >
                            {t("leadDetail.actions.sms")}
                        </Button>
                        <Button
                            variant="success"
                            iconStart={<MessageCircle size={16} />}
                            className="min-h-11"
                            onClick={() => window.open(`https://wa.me/${whatsappPhone(lead.phone)}`, "_blank", "noopener,noreferrer")}
                        >
                            {t("leadDetail.actions.whatsapp")}
                        </Button>
                        <Button variant="outline" size="sm" iconStart={<ArrowLeft size={14} />} onClick={() => router.push("/admin")}>
                            {t("leadDetail.backToDashboard")}
                        </Button>
                        <LeadStatusBadge status={lead.status} />
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <CardTitle>{t("leadDetail.info.title")}</CardTitle>
                        <dl className="mt-3 space-y-2 text-sm">
                            <InfoRow label={t("leadDetail.info.companyName")} value={lead.companyName || "—"} />
                            <InfoRow label={t("leadDetail.info.source")} value={lead.source || "—"} />
                            <InfoRow label={t("leadDetail.info.language")} value={lead.locale || "—"} />
                            <InfoRow
                                label={t("leadDetail.info.sourceDomain")}
                                value={lead.sourceDomain ? `${lead.sourceDomain}${lead.sourcePage || ""}` : "—"}
                            />
                            {lead.utm && Object.keys(lead.utm).length > 0 && (
                                <InfoRow
                                    label={t("leadDetail.info.utm")}
                                    value={Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(", ")}
                                />
                            )}
                            <InfoRow label={t("leadDetail.info.tags")} value={lead.tags?.length ? lead.tags.join(", ") : "—"} />
                            <InfoRow label={t("leadDetail.info.contactCount")} value={String(lead.contactCount || 1)} />
                            <InfoRow label={t("leadDetail.info.lastContact")} value={lead.lastContactAt ? formatDateTime(lead.lastContactAt, locale as Locale) : "—"} />
                            <InfoRow label={t("leadDetail.info.owner")} value={lead.ownerId || t("leadDetail.info.unassigned")} />
                            <InfoRow label={t("leadDetail.info.created")} value={formatDate(lead.createdAt, locale as Locale)} />
                        </dl>
                    </Card>

                    {isConverted ? (
                        <Card className="border-emerald-200 bg-emerald-50/80 dark:bg-emerald-900/10 dark:border-emerald-700/30">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="!text-emerald-800 dark:!text-emerald-200">
                                    {t("leadDetail.convertedCard.title")}
                                </CardTitle>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    {t("leadDetail.convertedCard.badge")}
                                </span>
                            </div>
                            <div className="mt-3 text-sm text-emerald-900 dark:text-emerald-100 space-y-1.5">
                                {lead.convertedAt && (
                                    <p><strong className="text-emerald-700 dark:text-emerald-300">{t("leadDetail.convertedCard.convertedAt")}</strong>{" "}{formatDateTime(lead.convertedAt, locale as Locale)}</p>
                                )}
                                {lead.convertedToCompanyId && (
                                    <p className="break-all"><strong className="text-emerald-700 dark:text-emerald-300">{t("leadDetail.convertedCard.companyId")}</strong>{" "}<span className="font-mono text-xs">{lead.convertedToCompanyId}</span></p>
                                )}
                                {lead.convertedToUserId ? (
                                    <p className="break-all"><strong className="text-emerald-700 dark:text-emerald-300">{t("leadDetail.convertedCard.userId")}</strong>{" "}<span className="font-mono text-xs">{lead.convertedToUserId}</span></p>
                                ) : (
                                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{t("leadDetail.convertedCard.noUserCreated")}</p>
                                )}
                            </div>
                            {lead.customerId && (
                                <div className="mt-4">
                                    <Link href={`/admin/customers/${lead.customerId}`}>
                                        <Button size="sm" variant="outline" fullWidth>
                                            {t("leadDetail.convertedCard.viewCustomer")}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </Card>
                    ) : (
                        <Card>
                            <CardTitle>{t("leadDetail.convertCard.title")}</CardTitle>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {t("leadDetail.convertCard.description")}
                            </p>
                            <Button variant="success" fullWidth className="mt-4" onClick={() => setIsConvertOpen(true)}>
                                {t("leadDetail.convertCard.button")}
                            </Button>
                        </Card>
                    )}

                    <Card>
                        <CardTitle>{t("leadDetail.changeStatus.title")}</CardTitle>
                        <div className="mt-3 space-y-3">
                            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as LeadStatus)}>
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                                ))}
                            </Select>
                            <Button fullWidth onClick={handleStatusChange}>
                                {t("leadDetail.changeStatus.button")}
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("leadDetail.assign.title")}</CardTitle>
                        <div className="mt-3 space-y-3">
                            <Field label="" hint={undefined}>
                                <Input
                                    value={assignOwner}
                                    onChange={(e) => setAssignOwner(e.target.value)}
                                    placeholder={t("leadDetail.assign.placeholder")}
                                />
                            </Field>
                            <Button fullWidth variant="secondary" onClick={handleAssign}>
                                {t("leadDetail.assign.button")}
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-2">
                    <Card>
                        <CardTitle>{t("leadDetail.timeline.title")}</CardTitle>
                        <div className="mt-4">
                            {lead.timeline && lead.timeline.length > 0 ? (
                                <ol className="space-y-3 max-h-96 overflow-y-auto pe-2">
                                    {[...lead.timeline].reverse().map((event: TimelineEvent, i: number) => (
                                        <li key={i} className="flex items-start gap-3 border-s-2 border-yellow-200 dark:border-yellow-700/50 ps-3 py-1">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{event.type.replace(/_/g, " ")}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(event.at, locale as Locale)}</p>
                                                {event.meta && (
                                                    <p className="text-xs text-gray-400 mt-1 break-words">{JSON.stringify(event.meta)}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <EmptyState icon={<Activity size={18} />} title={t("leadDetail.timeline.empty")} />
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardTitle>{t("leadDetail.notes.title")}</CardTitle>
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={t("leadDetail.notes.placeholder")}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                                />
                                <Button variant="success" onClick={handleAddNote}>
                                    {t("leadDetail.notes.addBtn")}
                                </Button>
                            </div>

                            {lead.notes && lead.notes.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto pe-2">
                                    {[...lead.notes].reverse().map((note: LeadNote, i: number) => (
                                        <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{note.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(note.createdAt, locale as Locale)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={<MessageSquare size={18} />} title={t("leadDetail.notes.empty")} />
                            )}
                        </div>
                    </Card>

                    {lead.messages && lead.messages.length > 0 && (
                        <Card>
                            <CardTitle>{t("leadDetail.messages.title")}</CardTitle>
                            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pe-2">
                                {[...lead.messages].reverse().map((msg, i) => (
                                    <div key={i} className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                                        <p className="text-xs text-gray-400 mt-1">{msg.source} · {formatDateTime(msg.createdAt, locale as Locale)}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <ConvertLeadModal
                isOpen={isConvertOpen}
                onClose={() => setIsConvertOpen(false)}
                lead={lead}
                onSubmit={handleConvertSubmit}
                onSuccess={fetchLead}
            />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="text-xs uppercase tracking-wide text-gray-400 min-w-[6rem]">{label}</dt>
            <dd className="text-sm text-gray-700 dark:text-gray-200 break-words">{value}</dd>
        </div>
    );
}
