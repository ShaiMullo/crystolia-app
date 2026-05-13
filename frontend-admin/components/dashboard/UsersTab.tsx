"use client";

import { Users as UsersIcon } from "lucide-react";
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
import type { User } from "@/types";

interface UsersTabProps {
    users: User[];
    loading: boolean;
    onEdit: (user: User) => void;
    onToggle: (user: User) => void;
}

export function UsersTab({ users, loading, onEdit, onToggle }: UsersTabProps) {
    const { t } = useAdminI18n();

    return (
        <TableContainer>
            <Table>
                <THead>
                    <TR>
                        <TH>{t("users.table.name")}</TH>
                        <TH>{t("users.table.email")}</TH>
                        <TH>{t("users.table.role")}</TH>
                        <TH>{t("users.table.status")}</TH>
                        <TH align="end">{t("users.table.actions")}</TH>
                    </TR>
                </THead>
                <TBody>
                    {loading ? (
                        <TableSkeleton columns={5} />
                    ) : users.length === 0 ? (
                        <TR>
                            <TD colSpan={5}>
                                <EmptyState icon={<UsersIcon size={18} />} title={t("users.empty")} />
                            </TD>
                        </TR>
                    ) : (
                        users.map((u) => (
                            <TR key={u._id}>
                                <TD className="font-medium">{u.name || "—"}</TD>
                                <TD muted>{u.email}</TD>
                                <TD>
                                    <Badge tone="neutral">{t(`role.${u.role}`)}</Badge>
                                </TD>
                                <TD>
                                    <Badge tone={u.isActive ? "success" : "danger"}>
                                        {u.isActive ? t("users.active") : t("users.inactive")}
                                    </Badge>
                                </TD>
                                <TD align="end">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => onEdit(u)}>
                                            {t("common.edit")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={u.isActive ? "ghost" : "success"}
                                            onClick={() => onToggle(u)}
                                        >
                                            {u.isActive ? t("users.deactivate") : t("users.activate")}
                                        </Button>
                                    </div>
                                </TD>
                            </TR>
                        ))
                    )}
                </TBody>
            </Table>
        </TableContainer>
    );
}
