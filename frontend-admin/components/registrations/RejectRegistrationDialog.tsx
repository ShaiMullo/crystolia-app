"use client";

import { useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { RejectRegistrationPayload } from "@/lib/registrationsApi";

interface RejectRegistrationDialogProps {
    isOpen: boolean;
    registrationName: string;
    loading: boolean;
    onClose: () => void;
    onConfirm: (payload: RejectRegistrationPayload) => void;
}

/**
 * Rejection dialog: optional internal reason, a toggle for notifying the
 * customer by email, and an explicit opt-in for sharing the reason in it.
 */
export function RejectRegistrationDialog({
    isOpen,
    registrationName,
    loading,
    onClose,
    onConfirm,
}: RejectRegistrationDialogProps) {
    const { t } = useAdminI18n();
    const [reason, setReason] = useState("");
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [shareReason, setShareReason] = useState(false);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            persistent={loading}
            title={t("registrations.confirm.rejectTitle")}
            description={t("registrations.confirm.rejectMessage", { name: registrationName })}
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="danger"
                        loading={loading}
                        onClick={() =>
                            onConfirm({
                                reason: reason.trim() || undefined,
                                notifyCustomer,
                                shareReason: notifyCustomer && shareReason,
                            })
                        }
                    >
                        {t("registrations.actions.reject")}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="reject-reason" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("registrations.confirm.reasonLabel")}
                    </label>
                    <Textarea
                        id="reject-reason"
                        rows={3}
                        maxLength={1000}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t("registrations.confirm.reasonPlaceholder")}
                    />
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={notifyCustomer}
                        onChange={(e) => setNotifyCustomer(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-yellow-500"
                    />
                    {t("registrations.confirm.notifyCustomer")}
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50">
                    <input
                        type="checkbox"
                        checked={notifyCustomer && shareReason}
                        disabled={!notifyCustomer || !reason.trim()}
                        onChange={(e) => setShareReason(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-yellow-500"
                    />
                    {t("registrations.confirm.shareReason")}
                </label>
            </div>
        </Modal>
    );
}

export default RejectRegistrationDialog;
