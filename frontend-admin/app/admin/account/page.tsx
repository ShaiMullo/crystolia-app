"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { KeyRound, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button, Card, CardTitle, CardDescription, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/app/context/AuthContext";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { changePassword } from "@/lib/accountApi";

// Mirror of the backend User model rule (UX only — backend is authoritative).
const STRONG_PW = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function AccountPage() {
    const { t } = useAdminI18n();
    const { user } = useAuth();

    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const roleLabel = (role?: string) => {
        if (role === "admin" || role === "agent" || role === "customer") {
            return t(`account.roles.${role}`);
        }
        return role ?? "—";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Client-side guards (the server re-validates everything).
        if (!current || !next || !confirm) {
            toast.error(t("account.password.errors.required"));
            return;
        }
        if (next !== confirm) {
            toast.error(t("account.password.errors.mismatch"));
            return;
        }
        if (!STRONG_PW.test(next)) {
            toast.error(t("account.password.errors.weak"));
            return;
        }
        if (next === current) {
            toast.error(t("account.password.errors.sameAsCurrent"));
            return;
        }

        setSubmitting(true);
        try {
            await changePassword({ currentPassword: current, newPassword: next });
            toast.success(t("account.password.success"));
            setCurrent("");
            setNext("");
            setConfirm("");
        } catch (err) {
            // Map server responses to friendly messages without leaking details.
            let msg = t("account.password.errors.generic");
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const data = err.response?.data as { error?: string; details?: string[] } | undefined;
                if (status === 401) msg = t("account.password.errors.currentIncorrect");
                else if (status === 400 && data?.details?.length) msg = t("account.password.errors.weak");
                else if (status === 400 && data?.error) msg = data.error;
            }
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t("account.title")} description={t("account.subtitle")} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Profile */}
                <Card>
                    <div className="flex items-center gap-2">
                        <UserCircle2 size={16} className="text-gray-400" />
                        <CardTitle>{t("account.profile.title")}</CardTitle>
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-gray-500 dark:text-gray-400">{t("account.profile.name")}</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-50">{user?.name || "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-gray-500 dark:text-gray-400">{t("account.profile.email")}</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-50 break-all">{user?.email || "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-gray-500 dark:text-gray-400">{t("account.profile.role")}</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-50">{roleLabel(user?.role)}</dd>
                        </div>
                    </dl>
                </Card>

                {/* Change password */}
                <Card>
                    <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-gray-400" />
                        <CardTitle>{t("account.password.title")}</CardTitle>
                    </div>
                    <CardDescription className="mt-1 flex items-center gap-1.5">
                        <ShieldCheck size={13} /> {t("account.password.hint")}
                    </CardDescription>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4" autoComplete="off">
                        <Field label={t("account.password.current")} required>
                            <Input
                                type="password"
                                autoComplete="current-password"
                                value={current}
                                onChange={(e) => setCurrent(e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t("account.password.new")} required>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                value={next}
                                onChange={(e) => setNext(e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t("account.password.confirm")} required>
                            <Input
                                type="password"
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </Field>
                        <Button type="submit" loading={submitting} iconStart={<KeyRound size={14} />}>
                            {t("account.password.submit")}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
