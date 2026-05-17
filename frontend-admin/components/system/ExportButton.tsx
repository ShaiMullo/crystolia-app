"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { downloadExport, type ExportDataset } from "@/lib/systemApi";

interface ExportButtonProps {
    dataset: ExportDataset;
    size?: "sm" | "md";
}

/** Single reusable export control — CSV by default, JSON on shift-click. */
export function ExportButton({ dataset, size = "sm" }: ExportButtonProps) {
    const { t } = useAdminI18n();
    const [busy, setBusy] = useState(false);

    const run = async (format: "csv" | "json") => {
        setBusy(true);
        try {
            await downloadExport(dataset, format);
            toast.success(t("exports.done"));
        } catch {
            toast.error(t("exports.failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button
            variant="outline"
            size={size}
            loading={busy}
            iconStart={<Download size={14} />}
            onClick={(e) => run(e.shiftKey ? "json" : "csv")}
            title={t("exports.hint")}
        >
            {t("exports.export")}
        </Button>
    );
}
