"use client";

import type { ReactNode } from "react";
import { Modal, Button, type ButtonVariant } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    /** Supplied by the caller — typically runs a mutation. */
    onConfirm: () => void;
    title: ReactNode;
    message?: ReactNode;
    confirmLabel: string;
    /** Defaults to common.cancel. */
    cancelLabel?: string;
    confirmVariant?: ButtonVariant;
    loading?: boolean;
}

/**
 * Generic, presentation-only confirmation dialog. The caller supplies the copy
 * and the confirm handler; reusable by any module. While `loading`, the dialog
 * is persistent (Esc / overlay-close disabled) so it can't be dismissed mid-op.
 */
export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    confirmVariant = "primary",
    loading = false,
}: ConfirmDialogProps) {
    const { t } = useAdminI18n();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            persistent={loading}
            title={title}
            footer={
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {cancelLabel ?? t("common.cancel")}
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </div>
            }
        >
            {message && <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>}
        </Modal>
    );
}

export default ConfirmDialog;
