"use client";

import { Badge } from "@/components/ui";
import { useAdminI18n } from "@/i18n/I18nProvider";
import { formatDateTime } from "@/lib/format";
import { countryName } from "@/lib/countries";
import type { Locale } from "@/i18n";
import type { Tone } from "@/lib/status";
import {
    registrationCompanyOf,
    registrationMethodOf,
    type NotificationStatus,
    type RegistrationRequest,
} from "@/lib/registrationsApi";

const NOTIFICATION_TONE: Record<NotificationStatus, Tone> = { sent: "success", failed: "danger", skipped: "neutral" };
const FLAG_KEYS: Record<string, string> = {
    "possible-duplicate-vat": "possibleDuplicateVat",
    "possible-duplicate-name": "possibleDuplicateName",
};

function Row({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100" dir={ltr ? "ltr" : undefined}>
                {value || "—"}
            </dd>
        </div>
    );
}

/** Full read-only view of a registration request (modal + detail page). */
export function RegistrationDetails({ registration }: { registration: RegistrationRequest }) {
    const { t, locale } = useAdminI18n();
    const r = registration;
    const company = registrationCompanyOf(r);
    const notifications = r.registrationNotifications;

    const notificationRows: Array<{ label: string; status?: NotificationStatus; at?: string }> = [
        { label: t("registrations.details.pendingEmail"), status: notifications?.pendingEmailStatus, at: notifications?.pendingEmailAt },
        { label: t("registrations.details.approvedEmail"), status: notifications?.approvedEmailStatus, at: notifications?.approvedEmailAt },
        { label: t("registrations.details.rejectedEmail"), status: notifications?.rejectedEmailStatus, at: notifications?.rejectedEmailAt },
        { label: t("registrations.details.adminSms"), status: notifications?.adminSmsStatus, at: notifications?.adminSmsAt },
    ];

    return (
        <div className="space-y-6">
            {r.registrationFlags && r.registrationFlags.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="mb-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {t("registrations.details.flagsTitle")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {r.registrationFlags.map((flag) => (
                            <Badge key={flag} tone="warning">
                                {FLAG_KEYS[flag] ? t(`registrations.flags.${FLAG_KEYS[flag]}`) : flag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Row label={t("registrations.details.contactName")} value={r.name} />
                <Row label={t("registrations.details.email")} value={r.email} ltr />
                <Row label={t("registrations.details.phone")} value={r.phone || company?.phone} ltr />
                <Row label={t("registrations.details.method")} value={t(`registrations.method.${registrationMethodOf(r)}`)} />
                <Row label={t("registrations.details.companyName")} value={company?.name} />
                <Row label={t("registrations.details.companyNumber")} value={company?.vatNumber} ltr />
                <Row label={t("registrations.details.country")} value={countryName(company?.country, locale as Locale)} />
                <Row label={t("registrations.details.language")} value={(r.preferredLocale ?? "").toUpperCase()} />
                <Row
                    label={t("registrations.details.submittedAt")}
                    value={r.createdAt ? formatDateTime(r.createdAt, locale as Locale) : ""}
                />
                {r.approvedAt && (
                    <Row
                        label={t("registrations.details.approvedAt")}
                        value={formatDateTime(r.approvedAt, locale as Locale)}
                    />
                )}
                {r.approvedBy && (
                    <Row label={t("registrations.details.approvedBy")} value={r.approvedBy.name || r.approvedBy.email} />
                )}
                {r.rejectedAt && (
                    <Row
                        label={t("registrations.details.rejectedAt")}
                        value={formatDateTime(r.rejectedAt, locale as Locale)}
                    />
                )}
                {r.rejectedBy && (
                    <Row label={t("registrations.details.rejectedBy")} value={r.rejectedBy.name || r.rejectedBy.email} />
                )}
                {r.rejectionReason && (
                    <div className="sm:col-span-2">
                        <Row label={t("registrations.details.rejectionReason")} value={r.rejectionReason} />
                    </div>
                )}
            </dl>

            <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {t("registrations.details.notifications")}
                </p>
                <div className="space-y-1.5">
                    {notificationRows.map(({ label, status, at }) => (
                        <div key={label} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{label}</span>
                            <span className="flex items-center gap-2">
                                {at && (
                                    <span className="text-xs text-gray-400">
                                        {formatDateTime(at, locale as Locale)}
                                    </span>
                                )}
                                <Badge tone={status ? NOTIFICATION_TONE[status] : "neutral"}>
                                    {status ? t(`registrations.notification.${status}`) : "—"}
                                </Badge>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RegistrationDetails;
