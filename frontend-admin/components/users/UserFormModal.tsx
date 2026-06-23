"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { CompanySelect } from "@/components/users/CompanySelect";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { AdminUser, CreateUserPayload, UpdateUserPayload, UserRole } from "@/lib/usersApi";
import type { Company } from "@/lib/companiesApi";

export type UserFormMode = "create" | "edit" | "view";

/**
 * Config-driven role behaviour. Field visibility/derivation comes from here
 * (not nested if/else), so adding a role later is a single entry.
 */
const ROLE_CONFIG: Record<UserRole, { showCompany: boolean; showPhone: boolean }> = {
    admin: { showCompany: false, showPhone: true },
    agent: { showCompany: false, showPhone: true },
    customer: { showCompany: true, showPhone: true },
};

const CREATE_ROLES: UserRole[] = ["admin", "agent", "customer"];
const EDIT_STAFF_ROLES: UserRole[] = ["admin", "agent"];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface UserFormModalProps {
    isOpen: boolean;
    mode: UserFormMode;
    user?: AdminUser | null;
    /** Default role for a fresh create (e.g. from the active tab). */
    defaultRole?: UserRole;
    companies: Company[];
    loading?: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => void;
}

interface FormState {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
    company: string | null;
    mustChangePassword: boolean;
}

type Errors = Partial<Record<"name" | "email" | "password", string>>;

function blankState(role: UserRole): FormState {
    return { name: "", email: "", password: "", role, phone: "", company: null, mustChangePassword: true };
}

function fromUser(u: AdminUser): FormState {
    return {
        name: u.name ?? "",
        email: u.email,
        password: "",
        role: u.role,
        phone: u.phone ?? "",
        company: u.company?._id ?? null,
        mustChangePassword: false,
    };
}

export function UserFormModal({
    isOpen,
    mode,
    user,
    defaultRole = "agent",
    companies,
    loading = false,
    onClose,
    onSubmit,
}: UserFormModalProps) {
    const { t } = useAdminI18n();
    // Lazy init from props. The page mounts this modal fresh on each open and
    // keys it by user, so state is always clean on open and discarded on close
    // (no setState-in-effect, no cascading renders).
    const [form, setForm] = useState<FormState>(() =>
        mode !== "create" && user ? fromUser(user) : blankState(defaultRole),
    );
    const [errors, setErrors] = useState<Errors>({});

    const isView = mode === "view";
    const isCreate = mode === "create";
    const cfg = ROLE_CONFIG[form.role];

    const roleOptions: UserRole[] = isCreate
        ? CREATE_ROLES
        : form.role === "customer"
            ? ["customer"]
            : EDIT_STAFF_ROLES;
    const roleEditable = !isView && (isCreate || form.role !== "customer");

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    // Frontend validation = immediate UX feedback only; the backend is the
    // source of truth (uniqueness, etc. surface via the toast error).
    const validate = (): boolean => {
        const e: Errors = {};
        if (!form.name.trim()) e.name = t("users.form.errNameRequired");
        if (isCreate) {
            if (!form.email.trim()) e.email = t("users.form.errEmailRequired");
            else if (!EMAIL_RE.test(form.email.trim())) e.email = t("users.form.errEmailInvalid");
            if (!form.password) e.password = t("users.form.errPasswordRequired");
            else if (form.password.length < 8) e.password = t("users.form.errPasswordMin");
        } else if (form.password && form.password.length < 8) {
            e.password = t("users.form.errPasswordMin");
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (ev: FormEvent) => {
        ev.preventDefault();
        if (isView || loading) return;
        if (!validate()) return;

        if (isCreate) {
            const payload: CreateUserPayload = {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                role: form.role,
                mustChangePassword: form.mustChangePassword,
            };
            if (cfg.showPhone && form.phone.trim()) payload.phone = form.phone.trim();
            if (cfg.showCompany) payload.company = form.company;
            onSubmit(payload);
        } else {
            const payload: UpdateUserPayload = { name: form.name.trim(), role: form.role };
            if (cfg.showPhone) payload.phone = form.phone.trim();
            if (cfg.showCompany) payload.company = form.company;
            if (form.password) payload.password = form.password;
            onSubmit(payload);
        }
    };

    const titleLabel = user?.name || user?.email || "";
    const title = isCreate
        ? t("users.modal.createTitle")
        : isView
            ? t("users.form.viewTitle", { label: titleLabel })
            : t("users.modal.editTitle", { label: titleLabel });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            persistent={loading}
            title={title}
            footer={
                isView ? (
                    <div className="flex justify-end">
                        <Button onClick={onClose}>{t("common.close")}</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={(e) => handleSubmit(e as unknown as FormEvent)} loading={loading}>
                            {isCreate ? t("users.modal.submitCreate") : t("users.modal.submitUpdate")}
                        </Button>
                    </div>
                )
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={t("users.modal.fullName")} required={!isView} error={errors.name}>
                    <Input
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        disabled={isView}
                        invalid={!!errors.name}
                    />
                </Field>

                <Field
                    label={t("users.modal.emailAddress")}
                    required={isCreate}
                    error={errors.email}
                    hint={mode === "edit" ? t("users.form.emailEditHint") : undefined}
                >
                    <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        disabled={isView || !isCreate}
                        invalid={!!errors.email}
                    />
                </Field>

                <Field label={t("users.modal.role")}>
                    <Select
                        value={form.role}
                        disabled={!roleEditable}
                        onChange={(e) => set("role", e.target.value as UserRole)}
                    >
                        {roleOptions.map((r) => (
                            <option key={r} value={r}>
                                {t(`role.${r}`)}
                            </option>
                        ))}
                    </Select>
                </Field>

                {cfg.showPhone && (
                    <Field label={t("users.form.phone")} optional={!isView ? t("users.form.optional") : undefined}>
                        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={isView} />
                    </Field>
                )}

                {cfg.showCompany && (
                    <Field label={t("users.form.company")} optional={!isView ? t("users.form.optional") : undefined}>
                        <CompanySelect
                            value={form.company}
                            companies={companies}
                            disabled={isView}
                            noneLabel={t("users.form.companyNone")}
                            onChange={(id) => set("company", id)}
                        />
                    </Field>
                )}

                {isCreate && (
                    <Field
                        label={t("users.modal.passwordCreate")}
                        required
                        error={errors.password}
                        hint={t("users.form.passwordHint")}
                    >
                        <Input
                            type="password"
                            value={form.password}
                            onChange={(e) => set("password", e.target.value)}
                            autoComplete="new-password"
                            invalid={!!errors.password}
                        />
                    </Field>
                )}

                {mode === "edit" && (
                    <Field
                        label={t("users.modal.passwordEdit")}
                        error={errors.password}
                        hint={t("users.form.passwordEditHint")}
                    >
                        <Input
                            type="password"
                            value={form.password}
                            onChange={(e) => set("password", e.target.value)}
                            autoComplete="new-password"
                            invalid={!!errors.password}
                        />
                    </Field>
                )}

                {isCreate && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                            checked={form.mustChangePassword}
                            onChange={(e) => set("mustChangePassword", e.target.checked)}
                        />
                        {t("users.form.mustChangePassword")}
                    </label>
                )}

                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
}

export default UserFormModal;
