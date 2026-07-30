"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
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
    notifyRegistrationsChanged,
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

    const [retryingNotification, setRetryingNotification] = useState(false);
    const handleRetryNotification = useCallback(async (confirmUnknown = false) => {
        if (!id || retryingNotification) return;
        setRetryingNotification(true);
        try {
            const result = await resendRegistrationEmail(id, confirmUnknown ? { confirmUnknown } : {});
            if (result.sent) {
                toast.success(t("registrations.notification.retrySent"));
            } else {
                toast.error(t("registrations.notification.retryFailedAgain"));
            }
            await fetchRegistration();
        } catch (err: unknown) {
            const e = err as { response?: { status?: number; data?: { error?: string } } };
            const code = e.response?.data?.error;
            if (code === "UNKNOWN_DELIVERY_CONFIRM_REQUIRED") {
                // Possible duplication — require an explicit admin decision.
                if (window.confirm(t("registrations.notification.unknownConfirm"))) {
                    setRetryingNotification(false);
                    await handleRetryNotification(true);
                    return;
                }
            } else if (e.response?.status === 429) {
                toast.error(t("registrations.notification.retryInProgress"));
            } else if (e.response?.status === 409) {
                toast.error(t("registrations.notification.retryNothing"));
            } else {
                toast.error(t("registrations.toasts.resendFailed"));
            }
        } finally {
            setRetryingNotification(false);
        }
    }, [id, retryingNotification, fetchRegistration, t]);

    const name = registration?.name || registration?.email || "";
    const BackIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

    const confirmApprove = () => {
        if (!registration) return;
        run({
            request: () => approveRegistration(registration._id),
            errorMessage: t("registrations.toasts.approveFailed"),
            onSuccess: (data) => {
                toast.success(t("registrations.toasts.approved"));
                if (data.emailNotificationSent === false) {
                    toast.error(t("registrations.toasts.emailNotSent"));
                }
                notifyRegistrationsChanged();
                setApproveOpen(false);
                fetchRegistration();
            },
        });
    };

    const confirmReject = (payload: RejectRegistrationPayload) => {
        if (!registration) return;
        run({
            request: () => rejectRegistration(registration._id, payload),
            errorMessage: t("registrations.toasts.rejectFailed"),
            onSuccess: (data) => {
                toast.success(t("registrations.toasts.rejected"));
                if (payload.notifyCustomer !== false && data.emailNotificationSent === false) {
                    toast.error(t("registrations.toasts.emailNotSent"));
                }
                notifyRegistrationsChanged();
                setRejectOpen(false);
                fetchRegistration();
            },
        });
    };

    const resend = () => handleRetryNotification();

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
                        <RegistrationDetails
                            registration={registration}
                            onRetryNotification={() => handleRetryNotification()}
                            retrying={retryingNotification}
                        />
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
