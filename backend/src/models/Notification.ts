// ===============================================
// 🔔 Notification Model (in-app)
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
    | 'lead_assigned'
    | 'lead_status_changed'
    | 'task_assigned'
    | 'task_overdue'
    | 'invoice_overdue'
    | 'invoice_issued'
    | 'customer_created'
    | 'automation_triggered'
    | 'generic';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId; // User
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    icon?: string;          // lucide name; UI can map to component
    channel: NotificationChannel;
    isRead: boolean;
    readAt?: Date;
    meta?: Record<string, unknown>;
    sourceAutomation?: string;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: [
                'lead_assigned',
                'lead_status_changed',
                'task_assigned',
                'task_overdue',
                'invoice_overdue',
                'invoice_issued',
                'customer_created',
                'automation_triggered',
                'generic',
            ],
            required: true,
            index: true,
        },
        title: { type: String, required: true, maxlength: 200 },
        body: { type: String, maxlength: 1000 },
        link: { type: String, maxlength: 500 },
        icon: { type: String, maxlength: 60 },
        channel: {
            type: String,
            enum: ['in_app', 'email', 'whatsapp'],
            default: 'in_app',
            index: true,
        },
        isRead: { type: Boolean, default: false, index: true },
        readAt: { type: Date },
        meta: { type: Schema.Types.Mixed },
        sourceAutomation: { type: String },
    },
    { timestamps: true },
);

// Most queries: my unread, newest first
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
