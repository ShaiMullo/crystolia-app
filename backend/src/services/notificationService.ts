// ===============================================
// 🔔 Notification Service
// ===============================================
// Single entry point for creating in-app notifications. Future channels
// (email, WhatsApp) plug in here without callers caring.

import mongoose from 'mongoose';
import Notification, { NotificationChannel, NotificationType } from '../models/Notification.js';

export interface CreateNotificationInput {
    recipientId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    icon?: string;
    channel?: NotificationChannel;
    meta?: Record<string, unknown>;
    sourceAutomation?: string;
}

export async function createNotification(input: CreateNotificationInput) {
    try {
        const doc = await Notification.create({
            recipient: input.recipientId,
            type: input.type,
            title: input.title,
            body: input.body,
            link: input.link,
            icon: input.icon,
            channel: input.channel || 'in_app',
            meta: input.meta,
            sourceAutomation: input.sourceAutomation,
        });
        return doc;
    } catch (err) {
        // Never let notification failures propagate — they are side-effects.
        console.error('❌ createNotification failed:', err);
        return null;
    }
}
