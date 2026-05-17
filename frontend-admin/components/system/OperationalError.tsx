"use client";

import { AlertOctagon, RotateCw } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";

interface OperationalErrorProps {
    /** Optional service tag, shown for support context. */
    service?: string;
    message?: string;
    onRetry?: () => void;
}

/** Graceful operational error card with a retry action. */
export function OperationalError({ service, message, onRetry }: OperationalErrorProps) {
    const { t } = useAdminI18n();
    return (
        <Card className="border-red-200 bg-red-50/70 dark:bg-red-900/10 dark:border-red-800/40">
            <div className="flex items-start gap-3">
                <AlertOctagon size={20} className="mt-0.5 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                        {t("monitoring.errorTitle")}
                    </h3>
                    <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                        {message || t("monitoring.errorBody")}
                    </p>
                    {service && (
                        <p className="mt-1 text-xs text-red-500 font-mono">{service}</p>
                    )}
                    {onRetry && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            iconStart={<RotateCw size={14} />}
                            onClick={onRetry}
                        >
                            {t("monitoring.retry")}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
