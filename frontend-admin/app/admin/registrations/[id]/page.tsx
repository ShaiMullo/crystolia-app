"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button, Card, LoadingState, PageHeader } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperationalError } from "@/components/system/OperationalError";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { useMutationRunner } from "@/lib/useMutationRunner";
import {
    getRegistration,
    approveRegistration,
    rejectRegistration,
    resendRegistrationEmail,
    type RegistrationRequest,
    type RejectRegistrationPayload,
} from "@/lib/registrationsApi";
import { RegistrationDetails } from "@/components/registrations/RegistrationDetails";
import { RejectRegistrationDialog } from "@/components/registrations/RejectRegistrationDialog";

/** Single registration request — the admin SMS deep-links here. */
export default function RegistrationDetailPage() {
    const { t, dir } = useAdminI18n();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [registration, setRegistration] = useState<RegistrationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);

    const { run, busy } = useMutationRunner();

    const fetchRegistration = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(false);
        try {
            setRegistration(await getRegistration(id));
        } catch {
            setError(true);
            setRegistration(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRegistration();
    }, [fetchRegistration]);

    const name = registration?.name || registration?.email || "";
    const BackIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

    const confirmApprove = () => {
        if (!registration) return;
        run({
            request: () => approveRegistration(registration._id),
            successMessage: t("registrations.toasts.approved"),
            errorMessage: t("registrations.toasts.approveFailed"),
            onSuccess: () => {
                setApproveOpen(false);
                fetchRegistration();
            },
        });
    };

    const confirmReject = (payload: RejectRegistrationPayload) => {
        if (!registration) return;
        run({
            request: () => rejectRegistration(registration._id, payload),
            successMessage: t("registrations.toasts.rejected"),
            errorMessage: t("registrations.toasts.rejectFailed"),
            onSuccess: () => {
                setRejectOpen(false);
                fetchRegistration();
            },
        });
    };

    const resend = () => {
        if (!registration) return;
        run({
            request: () => resendRegistrationEmail(registration._id),
            successMessage: t("registrations.toasts.resent"),
            errorMessage: t("registrations.toasts.resendFailed"),
            onSuccess: fetchRegistration,
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("registrations.details.title")}
                description={name}
                actions={
                    <Link
                        href="/admin/registrations"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        {t("registrations.actions.backToList")}
                        <BackIcon size={15} aria-hidden="true" />
                    </Link>
                }
            />

            {loading ? (
                <LoadingState />
            ) : error || !registration ? (
                <OperationalError service="registrations.detail" onRetry={fetchRegistration} />
            ) : (
                <>
                    <Card>
                        <RegistrationDetails registration={registration} />
                        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <Button variant="outline" onClick={resend} disabled={busy}>
                                {t("registrations.actions.resendEmail")}
                            </Button>
                            {registration.registrationStatus === "pending" && (
                                <Button variant="danger" onClick={() => setRejectOpen(true)} disabled={busy}>
                                    {t("registrations.actions.reject")}
                                </Button>
                            )}
                            {registration.registrationStatus !== "approved" && (
                                <Button variant="success" onClick={() => setApproveOpen(true)} disabled={busy}>
                                    {t("registrations.actions.approve")}
                                </Button>
                            )}
                        </div>
                    </Card>

                    {approveOpen && (
                        <ConfirmDialog
                            isOpen
                            onClose={() => setApproveOpen(false)}
                            onConfirm={confirmApprove}
                            loading={busy}
                            title={t("registrations.confirm.approveTitle")}
                            message={t("registrations.confirm.approveMessage", { name })}
                            confirmLabel={t("registrations.actions.approve")}
                            confirmVariant="success"
                        />
                    )}

                    {rejectOpen && (
                        <RejectRegistrationDialog
                            isOpen
                            registrationName={name}
                            loading={busy}
                            onClose={() => setRejectOpen(false)}
                            onConfirm={confirmReject}
                        />
                    )}
                </>
            )}
        </div>
    );
}
