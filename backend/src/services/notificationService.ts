// ===============================================
// 🔔 Notification Service
// ===============================================
// Single entry point for creating in-app notifications. Future channels
// (email, WhatsApp) plug in here without callers caring.

import mongoose from 'mongoose';
import Notification, { NotificationChannel, NotificationType } from '../models/Notification.js';
import User from '../models/User.js';

export interface CreateNotificationInput {
    recipientId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    icon?: string;
    channel?: NotificationChannel;
    meta?: Record<string, unknown>;
    dedupeKey?: string;
    sourceAutomation?: string;
}

export interface NotifyAdminsInput {
    type: NotificationType;
    /** Id of the entity this event is about — the idempotency key. A retry of
     *  the same event never creates a second notification per recipient. */
    entityId: string;
    title: string;
    body?: string;
    link?: string;
    icon?: string;
}

/**
 * Persist one in-app notification per active admin for a domain event.
 * Idempotent on (recipient, type, meta.entityId); failures are logged and
 * swallowed — losing a bell item must never lose the order/registration that
 * triggered it.
 */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
    try {
        const admins = await User.find({
            role: 'admin',
            isActive: true,
            isDeleted: { $ne: true },
        }).select('_id').lean();

        const dedupeKey = `${input.type}:${input.entityId}`;
        await Promise.all(admins.map(async (admin) => {
            try {
                await Notification.findOneAndUpdate(
                    {
                        recipient: admin._id,
                        channel: 'in_app',
                        dedupeKey,
                    },
                    {
                        $setOnInsert: {
                            recipient: admin._id,
                            type: input.type,
                            title: input.title,
                            body: input.body,
                            link: input.link,
                            icon: input.icon,
                            channel: 'in_app',
                            isRead: false,
                            meta: { entityId: input.entityId },
                            dedupeKey,
                        },
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true },
                );
            } catch (err) {
                // A competing upsert may win before this process sees the
                // unique index. That is a successful idempotent outcome.
                if ((err as { code?: number }).code !== 11000) throw err;
            }
        }));
    } catch (err) {
        console.error('❌ notifyAdmins failed:', err);
    }
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
            dedupeKey: input.dedupeKey,
            sourceAutomation: input.sourceAutomation,
        });
        return doc;
    } catch (err) {
        // Never let notification failures propagate — they are side-effects.
        console.error('❌ createNotification failed:', err);
        return null;
    }
}
