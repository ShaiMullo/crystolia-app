"use client";

import { useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface RejectOrderDialogProps {
    isOpen: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export function RejectOrderDialog({ isOpen, loading, onClose, onConfirm }: RejectOrderDialogProps) {
    const { t } = useAdminI18n();
    const [reason, setReason] = useState("");

    const close = () => {
        setReason("");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={close}
            persistent={loading}
            title={t("orders.reject.title")}
            description={t("orders.reject.description")}
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={loading} onClick={close}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="danger"
                        loading={loading}
                        disabled={!reason.trim()}
                        onClick={() => onConfirm(reason.trim())}
                    >
                        {t("orders.reject.confirm")}
                    </Button>
                </div>
            }
        >
            <label htmlFor="order-rejection-reason" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("orders.reject.reason")}
            </label>
            <Textarea
                id="order-rejection-reason"
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("orders.reject.placeholder")}
            />
        </Modal>
    );
}

export default RejectOrderDialog;
