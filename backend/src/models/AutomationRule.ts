// ===============================================
// ⚙️ AutomationRule Model
// ===============================================
// Lightweight rule engine: when {trigger} matches, run {actions}.
// Actions are interpreted by automationService — we deliberately keep
// the schema permissive so new actions/triggers don't require migrations.

import mongoose, { Document, Schema } from 'mongoose';

export type AutomationTrigger =
    | 'lead.created'
    | 'lead.status_changed'
    | 'lead.converted'
    | 'customer.created'
    | 'invoice.issued'
    | 'invoice.overdue'
    | 'task.overdue';

export type AutomationActionType =
    | 'create_task'
    | 'create_notification'
    | 'log_audit';

export interface IAutomationAction {
    type: AutomationActionType;
    /** Free-form params interpreted by the action handler. */
    params?: Record<string, unknown>;
}

export interface IAutomationCondition {
    /** Dot path into the event payload (e.g. "to" for status changes). */
    path: string;
    /** "eq" | "in" | "ne" — kept small intentionally. */
    op: 'eq' | 'in' | 'ne';
    value: unknown;
}

export interface IAutomationRule extends Document {
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    conditions: IAutomationCondition[];
    actions: IAutomationAction[];
    enabled: boolean;
    isSystem: boolean;        // seeded by code, not user-editable yet
    runCount: number;
    lastRunAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ActionSchema = new Schema<IAutomationAction>(
    {
        type: { type: String, enum: ['create_task', 'create_notification', 'log_audit'], required: true },
        params: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false },
);

const ConditionSchema = new Schema<IAutomationCondition>(
    {
        path: { type: String, required: true },
        op: { type: String, enum: ['eq', 'in', 'ne'], required: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { _id: false },
);

const AutomationRuleSchema = new Schema<IAutomationRule>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 500 },
        trigger: {
            type: String,
            enum: [
                'lead.created',
                'lead.status_changed',
                'lead.converted',
                'customer.created',
                'invoice.issued',
                'invoice.overdue',
                'task.overdue',
            ],
            required: true,
            index: true,
        },
        conditions: { type: [ConditionSchema], default: [] },
        actions: { type: [ActionSchema], default: [] },
        enabled: { type: Boolean, default: true, index: true },
        isSystem: { type: Boolean, default: false },
        runCount: { type: Number, default: 0 },
        lastRunAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

AutomationRuleSchema.index({ trigger: 1, enabled: 1 });

export const AutomationRule = mongoose.model<IAutomationRule>('AutomationRule', AutomationRuleSchema);
export default AutomationRule;
