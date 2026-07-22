// ===============================================
// SMS Service (Twilio Provider)
// ===============================================

import axios from 'axios';
import { config } from '../config/index.js';
import { normalizePhoneNumber } from './whatsappService.js';

export interface SendSmsResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

type SmsHttpClient = Pick<typeof axios, 'post'>;

export function isSmsConfigured(): boolean {
    return Boolean(
        config.sms.accountSid &&
        config.sms.authToken &&
        config.sms.fromNumber &&
        config.adminPhone,
    );
}

function toE164(phone: string): string {
    const normalized = normalizePhoneNumber(phone);
    return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

/**
 * Send a transactional SMS to the configured administrator. Provider errors
 * are returned to the caller instead of thrown so lead ingestion can stay
 * available even when the notification provider is down.
 */
export async function sendSms(
    to: string,
    message: string,
    httpClient: SmsHttpClient = axios,
): Promise<SendSmsResult> {
    if (!isSmsConfigured()) {
        return { success: false, error: 'Configuration missing' };
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.sms.accountSid)}/Messages.json`;
    const payload = new URLSearchParams({
        To: toE164(to),
        From: toE164(config.sms.fromNumber),
        Body: message,
    });

    try {
        const response = await httpClient.post(endpoint, payload.toString(), {
            auth: {
                username: config.sms.accountSid,
                password: config.sms.authToken,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 5000,
        });

        return {
            success: true,
            messageId: typeof response.data?.sid === 'string' ? response.data.sid : undefined,
        };
    } catch (error: unknown) {
        const detail = axios.isAxiosError(error)
            ? `Twilio request failed (${error.response?.status || 'network'})`
            : error instanceof Error
                ? error.message
                : 'Unknown SMS provider error';
        console.warn('[SMS] Delivery failed:', detail);
        return { success: false, error: detail };
    }
}
