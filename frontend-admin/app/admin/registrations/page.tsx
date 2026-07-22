"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Card, Input, Modal, PageHeader, Pagination, Select, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperationalError } from "@/components/system/OperationalError";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { useMutationRunner } from "@/lib/useMutationRunner";
import {
    listRegistrations,
    approveRegistration,
    rejectRegistration,
    resendRegistrationEmail,
    notifyRegistrationsChanged,
    type RegistrationRequest,
    type RegistrationsPagination,
    type RegistrationStatus,
    type RejectRegistrationPayload,
} from "@/lib/registrationsApi";
import { RegistrationsTable } from "@/components/registrations/RegistrationsTable";
import { RegistrationDetails } from "@/components/registrations/RegistrationDetails";
import { RejectRegistrationDialog } from "@/components/registrations/RejectRegistrationDialog";

type StatusFilter = "" | RegistrationStatus;

const LIMIT = 25;

export default function RegistrationsPage() {
    const { t } = useAdminI18n();

    const [status, setStatus] = useState<StatusFilter>("pending");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [pagination, setPagination] = useState<RegistrationsPagination | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [viewTarget, setViewTarget] = useState<RegistrationRequest | null>(null);
    const [approveTarget, setApproveTarget] = useState<RegistrationRequest | null>(null);
    const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);

    const { run, busy } = useMutationRunner();

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await listRegistrations({
                status: status || undefined,
                search: search || undefined,
                page,
                limit: LIMIT,
            });
            setRegistrations(res.data);
            setPagination(res.pagination);
        } catch {
            setError(true);
            setRegistrations([]);
            setPagination(undefined);
        } finally {
            setLoading(false);
        }
    }, [status, search, page]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const displayName = (r: RegistrationRequest | null): string =>
        r?.name || r?.email || "";

    const confirmApprove = () => {
        if (!approveTarget) return;
        run({
            request: () => approveRegistration(approveTarget._id),
            errorMessage: t("registrations.toasts.approveFailed"),
            onSuccess: (data) => {
                toast.success(t("registrations.toasts.approved"));
                if (data.emailNotificationSent === false) {
                    toast.error(t("registrations.toasts.emailNotSent"));
                }
                notifyRegistrationsChanged();
                setApproveTarget(null);
                setViewTarget(null);
                fetchRegistrations();
            },
        });
    };

    const confirmReject = (payload: RejectRegistrationPayload) => {
        if (!rejectTarget) return;
        run({
            request: () => rejectRegistration(rejectTarget._id, payload),
            errorMessage: t("registrations.toasts.rejectFailed"),
            onSuccess: (data) => {
                toast.success(t("registrations.toasts.rejected"));
                if (payload.notifyCustomer !== false && data.emailNotificationSent === false) {
                    toast.error(t("registrations.toasts.emailNotSent"));
                }
                notifyRegistrationsChanged();
                setRejectTarget(null);
                setViewTarget(null);
                fetchRegistrations();
            },
        });
    };

    const resend = (r: RegistrationRequest) => {
        run({
            request: () => resendRegistrationEmail(r._id),
            errorMessage: t("registrations.toasts.resendFailed"),
            onSuccess: (data) => {
                if (data.sent) toast.success(t("registrations.toasts.resent"));
                else toast.error(t("registrations.toasts.emailNotSent"));
                fetchRegistrations();
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t("registrations.page.title")} description={t("registrations.page.subtitle")} />

            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:max-w-xs sm:flex-1">
                    <Search size={15} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 start-3" />
                    <Input
                        type="search"
                        className="ps-9"
                        placeholder={t("registrations.search.placeholder")}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>

                <Select
                    className="sm:w-52"
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value as StatusFilter);
                        setPage(1);
                    }}
                    aria-label={t("registrations.filters.status")}
                >
                    <option value="">{t("registrations.filters.statusAll")}</option>
                    <option value="pending">{t("registrations.status.pending")}</option>
                    <option value="approved">{t("registrations.status.approved")}</option>
                    <option value="rejected">{t("registrations.status.rejected")}</option>
                </Select>
            </div>

            {error ? (
                <OperationalError service="registrations.list" onRetry={fetchRegistrations} />
            ) : (
                <Card padded={false}>
                    <RegistrationsTable
                        registrations={registrations}
                        loading={loading}
                        onView={setViewTarget}
                        onApprove={setApproveTarget}
                        onReject={setRejectTarget}
                        onResendEmail={resend}
                    />
                    {pagination && pagination.pages > 1 && (
                        <div className="px-4 py-3">
                            <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
                        </div>
                    )}
                </Card>
            )}

            {/* Details modal (view + actions) */}
            {viewTarget && (
                <Modal
                    isOpen
                    onClose={() => setViewTarget(null)}
                    size="lg"
                    title={t("registrations.details.title")}
                    description={displayName(viewTarget)}
                    footer={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => resend(viewTarget)} disabled={busy}>
                                {t("registrations.actions.resendEmail")}
                            </Button>
                            {viewTarget.registrationStatus === "pending" && (
                                <Button variant="danger" onClick={() => setRejectTarget(viewTarget)} disabled={busy}>
                                    {t("registrations.actions.reject")}
                                </Button>
                            )}
                            {viewTarget.registrationStatus !== "approved" && (
                                <Button variant="success" onClick={() => setApproveTarget(viewTarget)} disabled={busy}>
                                    {t("registrations.actions.approve")}
                                </Button>
                            )}
                        </div>
                    }
                >
                    <RegistrationDetails registration={viewTarget} />
                </Modal>
            )}

            {/* Approve confirmation */}
            {approveTarget && (
                <ConfirmDialog
                    isOpen
                    onClose={() => setApproveTarget(null)}
                    onConfirm={confirmApprove}
                    loading={busy}
                    title={t("registrations.confirm.approveTitle")}
                    message={t("registrations.confirm.approveMessage", { name: displayName(approveTarget) })}
                    confirmLabel={t("registrations.actions.approve")}
                    confirmVariant="success"
                />
            )}

            {/* Reject dialog (reason + email options) */}
            {rejectTarget && (
                <RejectRegistrationDialog
                    isOpen
                    registrationName={displayName(rejectTarget)}
                    loading={busy}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={confirmReject}
                />
            )}
        </div>
    );
}
