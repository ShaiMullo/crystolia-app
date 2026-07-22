// ===============================================
// 📱 WhatsApp Service (UltraMsg Provider)
// ===============================================

import axios from 'axios';
import { config } from '../config/index.js';

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 Helper: Phone Number Normalization
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Normalizes phone number to international format (Israel default).
 * 054... -> 97254...
 * 972... -> 972...
 * Removes non-digits.
 */
export function normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, ''); // Remove non-digits

    if (clean.startsWith('05')) {
        // Israel local format
        clean = '972' + clean.substring(1);
    }
    // If it already starts with 972, leave it.
    // If it's another country code, we leave it as is for now implies input is mostly IL.

    return clean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Send Text Message (UltraMsg)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendTextMessage(
    to: string,
    message: string
): Promise<SendMessageResult> {
    const { instanceId, token, baseUrl } = config.whatsapp;

    if (!instanceId || !token) {
        console.warn('⚠️ [WhatsApp] UltraMsg configuration missing. Message skipped.');
        return { success: false, error: 'Configuration missing' };
    }

    const normalizedTo = normalizePhoneNumber(to);
    const url = `${baseUrl}/${instanceId}/messages/chat`;

    try {
        // UltraMsg API expects JSON or UrlEncoded. Axios defaults to JSON.
        // Body: { token, to, body }
        const payload = {
            token: token,
            to: normalizedTo,
            body: message
        };

        // Never log the message body — it carries lead PII (name/phone/free text).
        console.log("📤 UltraMsg sending:", { to, length: message.length });

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // 5s timeout
        });

        console.log("✅ UltraMsg response:", response.data);

        // Basic success check
        // UltraMsg returns { "sent": "true", "message": "ok" } on success typically
        return {
            success: true,
            messageId: response.data?.id || 'sent',
        };
    } catch (error: any) {
        // Log warning but don't crash
        console.error("❌ UltraMsg error:", error.response?.data || error.message);
        console.warn('⚠️ [WhatsApp] Failed to send message:', error.message);
        if (error.response) {
            console.warn('   Response data:', error.response.data);
        }
        return {
            success: false,
            error: error.message,
        };
    }
}

