"use client";

import { Eye, KeyRound, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
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
import type { Locale } from "@/i18n";
import type { Tone } from "@/lib/status";
import type { AdminUser } from "@/lib/usersApi";

const ROLE_TONE: Record<string, Tone> = { admin: "indigo", agent: "teal", customer: "neutral" };

function initial(u: AdminUser): string {
    return (u.name || u.email || "?").trim().charAt(0).toUpperCase();
}

function companyName(u: AdminUser): string | null {
    return u.company && typeof u.company === "object" ? u.company.name : null;
}

interface UsersTableProps {
    users: AdminUser[];
    loading: boolean;
    /** Disables destructive self-actions for UX — the backend remains the real guard. */
    currentUserId?: string;
    onView: (u: AdminUser) => void;
    onEdit: (u: AdminUser) => void;
    onResetPassword: (u: AdminUser) => void;
    onToggleActive: (u: AdminUser) => void;
    onDelete: (u: AdminUser) => void;
}

/**
 * Users table — presentation-only. Every action is delegated to the page via
 * callbacks (no API calls here). Destructive self-actions are disabled as a UX
 * hint; authorization is always enforced server-side.
 */
export function UsersTable({
    users,
    loading,
    currentUserId,
    onView,
    onEdit,
    onResetPassword,
    onToggleActive,
    onDelete,
}: UsersTableProps) {
    const { t, locale } = useAdminI18n();
    const selfHint = t("users.actions.selfHint");

    return (
        <TableContainer>
            <Table>
                <THead>
                    <TR>
                        <TH className="w-10" aria-label="avatar"> </TH>
                        <TH>{t("users.table.name")}</TH>
                        <TH>{t("users.table.email")}</TH>
                        <TH>{t("users.table.role")}</TH>
                        <TH>{t("users.table.company")}</TH>
                        <TH>{t("users.table.status")}</TH>
                        <TH>{t("users.table.lastLogin")}</TH>
                        <TH>{t("users.table.createdAt")}</TH>
                        <TH align="end">{t("users.table.actions")}</TH>
                    </TR>
                </THead>
                <TBody>
                    {loading ? (
                        <TableSkeleton columns={9} />
                    ) : users.length === 0 ? (
                        <TR>
                            <TD colSpan={9}>
                                <EmptyState title={t("users.emptyFiltered")} />
                            </TD>
                        </TR>
                    ) : (
                        users.map((u) => {
                            const isSelf = !!currentUserId && u._id === currentUserId;
                            return (
                                <TR key={u._id}>
                                    <TD>
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500 text-xs font-semibold text-white">
                                            {initial(u)}
                                        </span>
                                    </TD>
                                    <TD className="font-medium">{u.name || "—"}</TD>
                                    <TD muted>{u.email}</TD>
                                    <TD>
                                        <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{t(`role.${u.role}`)}</Badge>
                                    </TD>
                                    <TD muted>{companyName(u) ?? "—"}</TD>
                                    <TD>
                                        <Badge tone={u.registrationStatus === "pending" ? "warning" : u.isActive ? "success" : "danger"}>
                                            {u.registrationStatus === "pending"
                                                ? t("users.pendingApproval")
                                                : u.isActive
                                                    ? t("users.active")
                                                    : t("users.inactive")}
                                        </Badge>
                                    </TD>
                                    <TD muted>
                                        {u.lastLogin ? formatDateTime(u.lastLogin, locale as Locale) : t("users.table.never")}
                                    </TD>
                                    <TD muted>{u.createdAt ? formatDateTime(u.createdAt, locale as Locale) : "—"}</TD>
                                    <TD align="end">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onView(u)}
                                                aria-label={t("users.actions.view")}
                                                iconStart={<Eye size={14} />}
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEdit(u)}
                                                aria-label={t("users.actions.edit")}
                                                iconStart={<Pencil size={14} />}
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={isSelf}
                                                title={isSelf ? selfHint : undefined}
                                                onClick={() => onResetPassword(u)}
                                                aria-label={t("users.actions.resetPassword")}
                                                iconStart={<KeyRound size={14} />}
                                            />
                                            {u.isActive ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isSelf}
                                                    title={isSelf ? selfHint : undefined}
                                                    onClick={() => onToggleActive(u)}
                                                    aria-label={t("users.actions.deactivate")}
                                                    iconStart={<UserX size={14} />}
                                                />
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onToggleActive(u)}
                                                    aria-label={u.registrationStatus === "pending" ? t("users.actions.approve") : t("users.actions.activate")}
                                                    iconStart={<UserCheck size={14} />}
                                                />
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={isSelf}
                                                title={isSelf ? selfHint : undefined}
                                                onClick={() => onDelete(u)}
                                                aria-label={t("users.actions.delete")}
                                                iconStart={<Trash2 size={14} />}
                                            />
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

export default UsersTable;
