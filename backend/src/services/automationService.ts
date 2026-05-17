// ===============================================
// ⚙️ Automation Service
// ===============================================
// dispatch({ event, payload }) finds matching enabled rules and runs
// their actions. Failures in one action never break the trigger flow.

import AutomationRule, { AutomationTrigger, IAutomationAction, IAutomationCondition, IAutomationRule } from '../models/AutomationRule.js';
import Task from '../models/Task.js';
import { createNotification } from './notificationService.js';

export interface AutomationEvent<T = Record<string, unknown>> {
    event: AutomationTrigger;
    payload: T;
}

function resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

function matches(rule: IAutomationRule, payload: unknown): boolean {
    for (const cond of rule.conditions as IAutomationCondition[]) {
        const actual = resolvePath(payload, cond.path);
        if (cond.op === 'eq' && actual !== cond.value) return false;
        if (cond.op === 'ne' && actual === cond.value) return false;
        if (cond.op === 'in') {
            const list = Array.isArray(cond.value) ? cond.value : [cond.value];
            if (!list.includes(actual)) return false;
        }
    }
    return true;
}

// Interpolate "{path.to.value}" placeholders in strings against the event payload.
function interpolate(template: unknown, payload: Record<string, unknown>): unknown {
    if (typeof template !== 'string') return template;
    return template.replace(/\{([\w.]+)\}/g, (_, key) => {
        const v = resolvePath(payload, key);
        return v === undefined || v === null ? '' : String(v);
    });
}

async function runAction(action: IAutomationAction, payload: Record<string, unknown>, ruleName: string): Promise<void> {
    const params = action.params || {};

    if (action.type === 'create_task') {
        const title = interpolate(params.title ?? 'Automated task', payload);
        const description = interpolate(params.description ?? '', payload);
        const assignedTo = (params.assignedToPath
            ? resolvePath(payload, String(params.assignedToPath))
            : params.assignedTo) as string | undefined;
        const relatedType = (params.relatedType || 'None') as 'Lead' | 'Customer' | 'Invoice' | 'Order' | 'None';
        const relatedId = (params.relatedIdPath
            ? resolvePath(payload, String(params.relatedIdPath))
            : params.relatedId) as string | undefined;
        const relatedLabel = interpolate(params.relatedLabel ?? '', payload) as string;
        const dueInDays = typeof params.dueInDays === 'number' ? params.dueInDays : undefined;
        const dueAt = dueInDays ? new Date(Date.now() + dueInDays * 24 * 3600 * 1000) : undefined;

        await Task.create({
            title: typeof title === 'string' && title.trim() ? title : 'Automated task',
            description: typeof description === 'string' && description.trim() ? description : undefined,
            assignedTo: assignedTo || undefined,
            relatedType,
            relatedId: relatedId || undefined,
            relatedLabel: relatedLabel || undefined,
            dueAt,
            priority: (params.priority as 'low' | 'normal' | 'high' | 'urgent' | undefined) || 'normal',
            sourceAutomation: ruleName,
        });
        return;
    }

    if (action.type === 'create_notification') {
        const recipientId = (params.recipientPath
            ? resolvePath(payload, String(params.recipientPath))
            : params.recipientId) as string | undefined;
        if (!recipientId) return;
        const title = interpolate(params.title ?? 'Notification', payload) as string;
        const body = interpolate(params.body ?? '', payload) as string;
        const link = interpolate(params.link ?? '', payload) as string;
        await createNotification({
            recipientId,
            type: (params.notificationType as 'lead_assigned' | 'lead_status_changed' | 'task_assigned' | 'task_overdue' | 'invoice_overdue' | 'invoice_issued' | 'customer_created' | 'automation_triggered' | 'generic' | undefined) || 'automation_triggered',
            title: title || 'Notification',
            body: body || undefined,
            link: link || undefined,
            icon: typeof params.icon === 'string' ? params.icon : undefined,
            sourceAutomation: ruleName,
        });
        return;
    }

    if (action.type === 'log_audit') {
        // Reserved for future use. Audit is already covered by route-level callers,
        // so we no-op here to avoid double-logging.
        return;
    }
}

export async function dispatch(event: AutomationEvent): Promise<void> {
    try {
        const rules = await AutomationRule.find({ trigger: event.event, enabled: true });
        if (rules.length === 0) return;

        for (const rule of rules) {
            if (!matches(rule, event.payload)) continue;
            try {
                for (const action of rule.actions) {
                    // eslint-disable-next-line no-await-in-loop
                    await runAction(action, event.payload as Record<string, unknown>, rule.name);
                }
                rule.runCount = (rule.runCount || 0) + 1;
                rule.lastRunAt = new Date();
                await rule.save();
            } catch (err) {
                console.error(`❌ automation rule "${rule.name}" failed:`, err);
            }
        }
    } catch (err) {
        // Never let automation break a parent request.
        console.error('❌ automation dispatch failed:', err);
    }
}

// ---------------- Default system rules (seeded on first run) ----------------

const DEFAULT_RULES: Array<Pick<IAutomationRule, 'name' | 'description' | 'trigger' | 'conditions' | 'actions' | 'enabled' | 'isSystem'>> = [
    {
        name: 'lead_qualified_notify_owner',
        description: 'Notify the assigned agent when a lead reaches qualified.',
        trigger: 'lead.status_changed',
        conditions: [{ path: 'to', op: 'eq', value: 'qualified' }],
        actions: [
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'assignedTo',
                    notificationType: 'lead_status_changed',
                    title: 'Lead qualified: {leadName}',
                    body: 'The lead {leadName} is ready for outreach.',
                    link: '/admin/leads/{leadId}',
                    icon: 'CheckCircle2',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
    {
        name: 'lead_converted_onboarding_task',
        description: 'Create an onboarding task when a lead is converted.',
        trigger: 'lead.converted',
        conditions: [],
        actions: [
            {
                type: 'create_task',
                params: {
                    title: 'Onboard new customer: {customerName}',
                    description: 'Welcome the new customer and confirm next steps.',
                    assignedToPath: 'assignedTo',
                    relatedType: 'Customer',
                    relatedIdPath: 'customerId',
                    relatedLabel: '{customerName}',
                    dueInDays: 2,
                    priority: 'high',
                },
            },
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'assignedTo',
                    notificationType: 'customer_created',
                    title: 'Lead converted: {customerName}',
                    body: 'A customer record was created from the lead.',
                    link: '/admin/customers/{customerId}',
                    icon: 'UserPlus',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
    {
        name: 'invoice_issued_log',
        description: 'Drop an audit-style notification for the issuer when an invoice is issued.',
        trigger: 'invoice.issued',
        conditions: [],
        actions: [
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'actorId',
                    notificationType: 'invoice_issued',
                    title: 'Invoice {invoiceNumber} issued',
                    body: 'Total: {totalAmount} for {companyName}.',
                    link: '/admin',
                    icon: 'FileText',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
    {
        name: 'payment_received_notify',
        description: 'Notify the actor when a payment is posted.',
        trigger: 'payment.received',
        conditions: [],
        actions: [
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'actorId',
                    notificationType: 'invoice_issued',
                    title: 'Payment received: {invoiceNumber}',
                    body: 'Amount {amount}. Invoice status: {paymentStatus}.',
                    link: '/admin/payments',
                    icon: 'Wallet',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
    {
        name: 'shipment_delivered_notify',
        description: 'Notify the actor when a shipment is delivered.',
        trigger: 'shipment.delivered',
        conditions: [],
        actions: [
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'actorId',
                    notificationType: 'generic',
                    title: 'Shipment delivered',
                    body: 'Tracking {trackingNumber} was delivered.',
                    link: '/admin/orders/{orderId}',
                    icon: 'Truck',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
    {
        name: 'low_stock_escalation',
        description: 'Notify the actor when a product crosses its low-stock threshold.',
        trigger: 'inventory.low_stock',
        conditions: [],
        actions: [
            {
                type: 'create_notification',
                params: {
                    recipientPath: 'actorId',
                    notificationType: 'generic',
                    title: 'Low stock: {productName}',
                    body: 'Available {available}, minimum {minimum}.',
                    link: '/admin/inventory',
                    icon: 'AlertTriangle',
                },
            },
        ],
        enabled: true,
        isSystem: true,
    },
];

export async function seedDefaultRules(): Promise<void> {
    try {
        for (const rule of DEFAULT_RULES) {
            // eslint-disable-next-line no-await-in-loop
            await AutomationRule.updateOne(
                { name: rule.name, isSystem: true },
                { $setOnInsert: rule },
                { upsert: true },
            );
        }
    } catch (err) {
        console.error('❌ seedDefaultRules failed:', err);
    }
}
