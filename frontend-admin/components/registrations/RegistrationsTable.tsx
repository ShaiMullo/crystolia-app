"use client";

import { CheckCircle2, Eye, MailPlus, XCircle } from "lucide-react";
import {
    Badge,
    Button,
    EmptyState,
    Table,
    TableContainer,
    TableSkeleton,
    TBody,
    TD,
    TH,
    THead,
    TR,
} from "@/components/ui";
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

const STATUS_TONE: Record<string, Tone> = { pending: "warning", approved: "success", rejected: "danger" };
const NOTIFICATION_TONE: Record<NotificationStatus, Tone> = { sent: "success", failed: "danger", skipped: "neutral" };

interface RegistrationsTableProps {
    registrations: RegistrationRequest[];
    loading: boolean;
    onView: (r: RegistrationRequest) => void;
    onApprove: (r: RegistrationRequest) => void;
    onReject: (r: RegistrationRequest) => void;
    onResendEmail: (r: RegistrationRequest) => void;
}

/** Latest customer-facing email outcome for the request's current status. */
function emailStatusOf(r: RegistrationRequest): NotificationStatus | undefined {
    const n = r.registrationNotifications;
    if (!n) return undefined;
    if (r.registrationStatus === "approved") return n.approvedEmailStatus ?? n.pendingEmailStatus;
    if (r.registrationStatus === "rejected") return n.rejectedEmailStatus ?? n.pendingEmailStatus;
    return n.pendingEmailStatus;
}

/**
 * Registration requests table — presentation-only, same conventions as
 * UsersTable: every action is delegated to the page via callbacks.
 */
export function RegistrationsTable({
    registrations,
    loading,
    onView,
    onApprove,
    onReject,
    onResendEmail,
}: RegistrationsTableProps) {
    const { t, locale } = useAdminI18n();

    return (
        <TableContainer>
            <Table>
                <THead>
                    <TR>
                        <TH>{t("registrations.table.date")}</TH>
                        <TH>{t("registrations.table.contact")}</TH>
                        <TH>{t("registrations.table.company")}</TH>
                        <TH>{t("registrations.table.companyNumber")}</TH>
                        <TH>{t("registrations.table.phone")}</TH>
                        <TH>{t("registrations.table.email")}</TH>
                        <TH>{t("registrations.table.country")}</TH>
                        <TH>{t("registrations.table.locale")}</TH>
                        <TH>{t("registrations.table.method")}</TH>
                        <TH>{t("registrations.table.notifications")}</TH>
                        <TH>{t("registrations.table.status")}</TH>
                        <TH align="end">{t("registrations.table.actions")}</TH>
                    </TR>
                </THead>
                <TBody>
                    {loading ? (
                        <TableSkeleton columns={12} />
                    ) : registrations.length === 0 ? (
                        <TR>
                            <TD colSpan={12}>
                                <EmptyState title={t("registrations.emptyFiltered")} />
                            </TD>
                        </TR>
                    ) : (
                        registrations.map((r) => {
                            const company = registrationCompanyOf(r);
                            const emailStatus = emailStatusOf(r);
                            const smsStatus = r.registrationNotifications?.adminSmsStatus;
                            const status = r.registrationStatus ?? "pending";
                            return (
                                <TR key={r._id}>
                                    <TD muted>{r.createdAt ? formatDateTime(r.createdAt, locale as Locale) : "—"}</TD>
                                    <TD className="font-medium">{r.name || "—"}</TD>
                                    <TD>{company?.name || "—"}</TD>
                                    <TD muted>
                                        <span dir="ltr">{company?.vatNumber || "—"}</span>
                                    </TD>
                                    <TD muted>
                                        <span dir="ltr">{r.phone || company?.phone || "—"}</span>
                                    </TD>
                                    <TD muted>
                                        <span dir="ltr">{r.email}</span>
                                    </TD>
                                    <TD muted>{countryName(company?.country, locale as Locale)}</TD>
                                    <TD muted className="uppercase">{r.preferredLocale ?? "—"}</TD>
                                    <TD>{t(`registrations.method.${registrationMethodOf(r)}`)}</TD>
                                    <TD>
                                        <div className="flex flex-wrap items-center gap-1">
                                            <Badge tone={emailStatus ? NOTIFICATION_TONE[emailStatus] : "neutral"}>
                                                {t("registrations.notification.email")}: {emailStatus ? t(`registrations.notification.${emailStatus}`) : "—"}
                                            </Badge>
                                            <Badge tone={smsStatus ? NOTIFICATION_TONE[smsStatus] : "neutral"}>
                                                {t("registrations.notification.sms")}: {smsStatus ? t(`registrations.notification.${smsStatus}`) : "—"}
                                            </Badge>
                                        </div>
                                    </TD>
                                    <TD>
                                        <Badge tone={STATUS_TONE[status] ?? "neutral"}>
                                            {t(`registrations.status.${status}`)}
                                        </Badge>
                                    </TD>
                                    <TD align="end">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onView(r)}
                                                aria-label={t("registrations.actions.view")}
                                                iconStart={<Eye size={14} />}
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onResendEmail(r)}
                                                aria-label={t("registrations.actions.resendEmail")}
                                                iconStart={<MailPlus size={14} />}
                                            />
                                            {status !== "approved" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-green-700 dark:text-green-400"
                                                    onClick={() => onApprove(r)}
                                                    aria-label={t("registrations.actions.approve")}
                                                    iconStart={<CheckCircle2 size={14} />}
                                                />
                                            )}
                                            {status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-700 dark:text-red-400"
                                                    onClick={() => onReject(r)}
                                                    aria-label={t("registrations.actions.reject")}
                                                    iconStart={<XCircle size={14} />}
                                                />
                                            )}
                                        </div>
                                    </TD>
                                </TR>
                            );
                        })
                    )}
                </TBody>
            </Table>
        </TableContainer>
    );
}

export default RegistrationsTable;
