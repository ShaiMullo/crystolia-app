"use client";

import React, { useEffect, useState } from "react";
import {
    Button,
    Field,
    Input,
    Modal,
    Select,
    Textarea,
} from "@/components/ui";
import { Lead, User } from "@/types";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface LeadEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    agents: User[];
    onSave: (leadId: string, data: Partial<Lead>) => Promise<void>;
    canAssign?: boolean;
}

const STATUS_VALUES: Lead["status"][] = [
    "new", "contacted", "qualified", "proposal", "won", "lost", "converted", "closed", "archived", "re-engaged",
];

export default function LeadEditModal({
    isOpen,
    onClose,
    lead,
    agents,
    onSave,
    canAssign = true,
}: LeadEditModalProps) {
    const { t } = useAdminI18n();
    const [status, setStatus] = useState<Lead["status"]>(lead?.status || "new");
    const [assignedTo, setAssignedTo] = useState(lead?.assignedTo || "");
    const [noteText, setNoteText] = useState("");
    const [tags, setTags] = useState(lead?.tags?.join(", ") || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lead) {
            setStatus(lead.status);
            setAssignedTo(lead.assignedTo || "");
            setNoteText("");
            setTags(lead.tags?.join(", ") || "");
        }
    }, [lead, isOpen]);

    if (!isOpen || !lead) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead) return;
        setLoading(true);
        try {
            const tagsArray = tags.split(",").map((s) => s.trim()).filter(Boolean);
            const payload: Partial<Lead> = { status, assignedTo, tags: tagsArray };
            if (noteText.trim()) {
                const newNote = { text: noteText.trim(), createdAt: new Date().toISOString() };
                payload.notes = [...(lead.notes || []), newNote];
            }
            await onSave(lead._id, payload);
            onClose();
        } catch (error) {
            console.error("Failed to update lead", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("leads.modal.editTitle", { name: lead.name })}
            size="md"
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={loading}>
                        {loading ? t("common.saving") : t("leads.modal.saveChanges")}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={t("leads.modal.status")}>
                    <Select value={status} onChange={(e) => setStatus(e.target.value as Lead["status"])}>
                        {STATUS_VALUES.map((s) => (
                            <option key={s} value={s}>{t(`status.${s}`)}</option>
                        ))}
                    </Select>
                </Field>

                {canAssign && (
                    <Field label={t("leads.modal.assignAgent")}>
                        <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                            <option value="">{t("leads.modal.unassigned")}</option>
                            {agents.map((agent) => (
                                <option key={agent._id} value={agent._id}>
                                    {agent.name || agent.email}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}

                <Field label={t("leads.modal.tagsLabel")}>
                    <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder={t("leads.modal.tagsPlaceholder")}
                    />
                </Field>

                <Field label={t("leads.modal.addNote")}>
                    <Textarea
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={t("leads.modal.addNotePlaceholder")}
                    />
                </Field>

                {/* Hidden submit to allow Enter-to-submit */}
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
