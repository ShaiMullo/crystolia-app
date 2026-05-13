"use client";

import { Badge } from "@/components/ui";
import { invoiceStatusTone, leadStatusTone, orderStatusTone } from "@/lib/status";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type { InvoiceStatus, LeadStatus, OrderStatus } from "@/types";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={leadStatusTone[status]}>{t(`status.${status}`)}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={orderStatusTone[status]}>{t(`orderStatus.${status}`)}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={invoiceStatusTone[status]}>{t(`invoiceStatus.${status}`)}</Badge>;
}
