"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    /** null → confirm phase; a string → reveal phase (the one-time temp password). */
    tempPassword: string | null;
    loading: boolean;
    /** Supplied by the page — runs the reset, then sets `tempPassword`. */
    onConfirm: () => void;
}

/**
 * Two-phase reset-password modal (presentation-only — the page performs the
 * reset and feeds the temp password back in via props).
 *
 *  - Confirm phase: warns about session invalidation, asks to proceed.
 *  - Reveal phase: shows the one-time temp password with copy-to-clipboard.
 *
 * The temp password is never stored here beyond the prop; `copied` is cleared
 * on close. While loading or revealed, the modal is persistent so the secret
 * isn't dismissed by an accidental Esc / overlay click.
 */
export function ResetPasswordModal({ isOpen, onClose, userName, tempPassword, loading, onConfirm }: ResetPasswordModalProps) {
    const { t } = useAdminI18n();
    // `copied` resets naturally: the page mounts this modal only while open, so
    // closing it unmounts and discards all local state.
    const [copied, setCopied] = useState(false);

    const revealed = tempPassword !== null;

    const handleCopy = async () => {
        if (!tempPassword) return;
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
        } catch {
            // Clipboard unavailable — the value is visible for manual copy.
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            persistent={loading || revealed}
            title={revealed ? t("users.reset.revealTitle") : t("users.reset.confirmTitle")}
            footer={
                revealed ? (
                    <div className="flex items-center justify-end">
                        <Button onClick={onClose}>{t("common.done")}</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="danger" onClick={onConfirm} loading={loading} iconStart={<KeyRound size={14} />}>
                            {t("users.reset.confirm")}
                        </Button>
                    </div>
                )
            }
        >
            {revealed ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t("users.reset.revealIntro", { name: userName })}
                    </p>
                    <div className="flex items-center gap-2">
                        <Input
                            readOnly
                            value={tempPassword ?? ""}
                            className="font-mono"
                            onFocus={(e) => e.currentTarget.select()}
                        />
                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            iconStart={copied ? <Check size={14} /> : <Copy size={14} />}
                        >
                            {copied ? t("users.reset.copied") : t("common.copy")}
                        </Button>
                    </div>
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                        <span>{t("users.reset.warning")}</span>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("users.reset.confirmMessage", { name: userName })}
                </p>
            )}
        </Modal>
    );
}

export default ResetPasswordModal;
