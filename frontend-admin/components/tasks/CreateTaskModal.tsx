"use client";

import React, { useEffect, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { TaskPriority, TaskRelatedType, User } from "@/types";

const PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];

export interface CreateTaskPayload {
    title: string;
    description?: string;
    priority: TaskPriority;
    dueAt?: string;
    assignedTo?: string;
    relatedType?: TaskRelatedType;
    relatedId?: string;
    relatedLabel?: string;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    agents: User[];
    initial?: Partial<CreateTaskPayload>;
    onSubmit: (payload: CreateTaskPayload) => Promise<void>;
}

export function CreateTaskModal({ isOpen, onClose, agents, initial, onSubmit }: CreateTaskModalProps) {
    const { t } = useAdminI18n();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("normal");
    const [dueAt, setDueAt] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(initial?.title || "");
        setDescription(initial?.description || "");
        setPriority(initial?.priority || "normal");
        setDueAt(initial?.dueAt || "");
        setAssignedTo(initial?.assignedTo || "");
        setSaving(false);
        setError(null);
    }, [isOpen, initial]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError(t("tasks.create.titleRequired"));
            return;
        }
        setSaving(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                dueAt: dueAt || undefined,
                assignedTo: assignedTo || undefined,
                relatedType: initial?.relatedType,
                relatedId: initial?.relatedId,
                relatedLabel: initial?.relatedLabel,
            });
            onClose();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string; message?: string } } };
            setError(e.response?.data?.error || e.response?.data?.message || t("tasks.create.failed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={t("tasks.create.title")}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={saving}>
                        {t("common.create")}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                        {error}
                    </div>
                )}
                <Field label={t("tasks.create.titleLabel")} required>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </Field>
                <Field label={t("tasks.create.description")}>
                    <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={t("tasks.create.priority")}>
                        <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                            {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t("tasks.create.due")}>
                        <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                    </Field>
                </div>
                <Field label={t("tasks.create.assignedTo")}>
                    <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                        <option value="">{t("tasks.create.assignToMe")}</option>
                        {agents.map((a) => (
                            <option key={a._id} value={a._id}>{a.name || a.email}</option>
                        ))}
                    </Select>
                </Field>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
