"use client";

import { Badge } from "@/components/ui";
import {
    customerStatusTone,
    invoiceStatusTone,
    leadStatusTone,
    orderStatusTone,
    paymentStatusTone,
    purchaseOrderStatusTone,
    shipmentStatusTone,
} from "@/lib/status";
import { useAdminI18n } from "@/i18n/I18nProvider";
import type {
    CustomerStatus,
    InvoiceStatus,
    InvoicePaymentStatus,
    LeadStatus,
    OrderStatus,
    PurchaseOrderStatus,
    ShipmentStatus,
} from "@/types";

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

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={customerStatusTone[status]}>{t(`customerStatus.${status}`)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: InvoicePaymentStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={paymentStatusTone[status]}>{t(`payments.status.${status}`)}</Badge>;
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={shipmentStatusTone[status]}>{t(`shipments.status.${status}`)}</Badge>;
}

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
    const { t } = useAdminI18n();
    return <Badge tone={purchaseOrderStatusTone[status]}>{t(`purchaseOrders.status.${status}`)}</Badge>;
}
