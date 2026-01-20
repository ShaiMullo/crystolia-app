/**
 * Notifications Service
 * Unifies WhatsApp and SMS with fallback logic
 */

import { sendTemplateMessage, sendTextMessage, checkConfiguration as checkWhatsapp } from './whatsappService.js';
import { sendSMS, sendWelcomeSMS } from './smsService.js';

export class NotificationsService {

    /**
     * Send order confirmation with invoice link
     * Tries WhatsApp first, falls back to SMS if failed or not configured
     */
    async sendOrderConfirmation(
        customer: { name: string; phone: string },
        orderId: string,
        invoiceUrl: string
    ): Promise<{ method: 'whatsapp' | 'sms' | 'none'; success: boolean }> {
        const phone = customer.phone?.replace(/[^0-9]/g, ''); // Clean phone number

        if (!phone) {
            console.warn(`⚠️ Cannot send notification: Missing phone number for ${customer.name}`);
            return { method: 'none', success: false };
        }

        console.log(`🔔 Sending order confirmation to ${customer.name} (${phone})`);

        // 1. Try WhatsApp
        if (checkWhatsapp().configured) {
            try {
                const message = `🌻 היי ${customer.name}, איזה כיף!\n\n` +
                    `ההזמנה שלך (${orderId}) אושרה בהצלחה! 🎉\n\n` +
                    `📄 החשבונית שלך מחכה לך כאן:\n${invoiceUrl}\n\n` +
                    `תודה שבחרת ב-Crystolia!`;

                const result = await sendTextMessage(phone, message);

                if (result.success) {
                    console.log(`✅ WhatsApp sent to ${phone}`);
                    return { method: 'whatsapp', success: true };
                } else {
                    console.warn(`⚠️ WhatsApp failed, trying SMS fallback... (${result.error})`);
                }
            } catch (error) {
                console.error('❌ WhatsApp Error:', error);
            }
        } else {
            console.log('ℹ️ WhatsApp not configured, skipping to SMS');
        }

        // 2. Fallback to SMS
        try {
            const smsMessage = `Crystolia: היי ${customer.name}, החשבונית להזמנה ${orderId.slice(-6)} זמינה: ${invoiceUrl}`;
            const sent = await sendSMS(phone, smsMessage);

            if (sent) {
                console.log(`✅ SMS sent to ${phone}`);
                return { method: 'sms', success: true };
            }
        } catch (error) {
            console.error('❌ SMS Error:', error);
        }

        console.error(`❌ All notification methods failed for ${customer.name}`);
        return { method: 'none', success: false };
    }
}

export const notificationsService = new NotificationsService();
