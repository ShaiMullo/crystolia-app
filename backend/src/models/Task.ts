// ===============================================
// ✅ Task Model (CRM follow-ups / reminders)
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskRelatedType = 'Lead' | 'Customer' | 'Invoice' | 'Order' | 'None';

export interface ITask extends Document {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt?: Date;
    completedAt?: Date;
    assignedTo?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;

    relatedType: TaskRelatedType;
    relatedId?: mongoose.Types.ObjectId;
    relatedLabel?: string; // human label cached for list rendering

    /** Set by the automation engine; lets us trace which rule produced this task. */
    sourceAutomation?: string;

    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 4000 },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'done', 'cancelled'],
            default: 'open',
            index: true,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
            index: true,
        },
        dueAt: { type: Date, index: true },
        completedAt: { type: Date },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

        relatedType: {
            type: String,
            enum: ['Lead', 'Customer', 'Invoice', 'Order', 'None'],
            default: 'None',
            index: true,
        },
        relatedId: { type: Schema.Types.ObjectId, index: true },
        relatedLabel: { type: String, trim: true, maxlength: 200 },

        sourceAutomation: { type: String, trim: true },

        isDeleted: { type: Boolean, default: false, index: true },
    },
    { timestamps: true },
);

// Frequent dashboard query: my open tasks by due date
TaskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });
// Activity / related-entity scoped fetches
TaskSchema.index({ relatedType: 1, relatedId: 1, createdAt: -1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
export default Task;
