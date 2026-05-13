"use client";

import React, { useEffect, useState } from "react";
import {
    Button,
    Field,
    Input,
    Modal,
    Select,
} from "@/components/ui";
import { User } from "@/types";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface UserPayload {
    name: string;
    email: string;
    role: "admin" | "agent";
    password?: string;
}

interface UserActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "create" | "edit";
    user?: User | null;
    onSave: (data: UserPayload) => Promise<void>;
}

export default function UserActionModal({ isOpen, onClose, mode, user, onSave }: UserActionModalProps) {
    const { t } = useAdminI18n();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"admin" | "agent">("agent");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (mode === "edit" && user) {
            setName(user.name || "");
            setEmail(user.email);
            setRole(user.role);
            setPassword("");
        } else {
            setName("");
            setEmail("");
            setPassword("");
            setRole("agent");
        }
    }, [isOpen, mode, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: UserPayload = { name, email, role };
            if (password) payload.password = password;
            await onSave(payload);
            onClose();
        } catch (error) {
            console.error("Failed to save user", error);
        } finally {
            setLoading(false);
        }
    };

    const submitLabel = mode === "create" ? t("users.modal.submitCreate") : t("users.modal.submitUpdate");

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={
                mode === "create"
                    ? t("users.modal.createTitle")
                    : t("users.modal.editTitle", { label: user?.name || user?.email || "" })
            }
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t("common.cancel")}</Button>
                    <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} loading={loading}>
                        {loading ? t("users.modal.submitting") : submitLabel}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={t("users.modal.fullName")} required>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>

                <Field label={t("users.modal.emailAddress")} required>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={mode === "edit"}
                    />
                </Field>

                <Field label={mode === "create" ? t("users.modal.passwordCreate") : t("users.modal.passwordEdit")} required={mode === "create"}>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={mode === "create"}
                        autoComplete="new-password"
                    />
                </Field>

                <Field label={t("users.modal.role")}>
                    <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "agent")}>
                        <option value="agent">{t("role.agent")}</option>
                        <option value="admin">{t("role.admin")}</option>
                    </Select>
                </Field>

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}
