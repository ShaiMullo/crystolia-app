// Centralized status → visual tone maps. Kept here so badges, selects,
// and chips stay in sync without hardcoded per-page palettes.

import type { CustomerStatus, LeadStatus, OrderStatus, InvoiceStatus } from "@/types";

export type Tone =
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "indigo"
    | "purple"
    | "teal"
    | "emerald";

const toneClassesSoft: Record<Tone, string> = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

export function toneClass(tone: Tone): string {
    return toneClassesSoft[tone];
}

export const leadStatusTone: Record<LeadStatus, Tone> = {
    new: "info",
    contacted: "warning",
    qualified: "purple",
    proposal: "indigo",
    won: "success",
    lost: "danger",
    converted: "emerald",
    closed: "neutral",
    archived: "neutral",
    "re-engaged": "teal",
};

export const orderStatusTone: Record<OrderStatus, Tone> = {
    pending: "warning",
    approved: "info",
    shipped: "indigo",
    completed: "success",
    cancelled: "danger",
};

export const invoiceStatusTone: Record<InvoiceStatus, Tone> = {
    draft: "neutral",
    issued: "info",
    paid: "success",
    cancelled: "danger",
};

export const customerStatusTone: Record<CustomerStatus, Tone> = {
    active: "success",
    inactive: "neutral",
    "on-hold": "warning",
    archived: "neutral",
};
