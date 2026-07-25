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

export interface LeadSmsDetails {
    name: string;
    companyName?: string;
    phone: string;
    email?: string;
    message?: string;
    source: string;
    sourceDomain?: string;
    sourcePage?: string;
    contactCount: number;
    leadUrl: string;
}

export interface RegistrationSmsDetails {
    contactName: string;
    companyName: string;
    vatNumber: string;
    phone: string;
    email: string;
    country: string;
    method: 'password' | 'google';
    registrationUrl: string;
}

export interface NewOrderSmsDetails {
    orderId: string;
    customerName: string;
    companyName: string;
    phone?: string;
    itemCount: number;
    totalAmount: number;
    orderUrl: string;
}

export interface OrderStatusSmsDetails {
    customerName: string;
    orderId: string;
    statusLabel: string;
    totalAmount: number;
    dashboardUrl: string;
}

type SmsHttpClient = Pick<typeof axios, 'post'>;

export function isSmsTransportConfigured(): boolean {
    return Boolean(
        config.sms.accountSid &&
        config.sms.authToken &&
        (config.sms.messagingServiceSid || config.sms.fromNumber),
    );
}

export function isSmsConfigured(): boolean {
    return Boolean(isSmsTransportConfigured() && config.adminPhone);
}

function toE164(phone: string): string {
    const normalized = normalizePhoneNumber(phone);
    return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

function compactSmsField(value: string, maxLength: number): string {
    const compact = value.replace(/\s+/g, ' ').trim();
    return compact.length <= maxLength
        ? compact
        : `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * Build a compact Hebrew lead alert. User-provided fields are flattened to a
 * single line and capped so an unexpectedly long form message cannot create
 * an excessive number of billable SMS segments.
 */
export function buildLeadNotificationSms(details: LeadSmsDetails): string {
    const title = details.contactCount > 1
        ? '🔁 פנייה חוזרת בקריסטוליה'
        : '🌻 ליד חדש בקריסטוליה';
    const source = details.sourceDomain
        ? `${details.sourceDomain}${details.sourcePage || ''}`
        : details.source;
    const lines = [
        title,
        `👤 ${compactSmsField(details.name, 70)}`,
    ];

    if (details.companyName) {
        lines.push(`🏢 ${compactSmsField(details.companyName, 90)}`);
    }

    lines.push(`📞 ${compactSmsField(details.phone, 30)}`);

    if (details.email) {
        lines.push(`✉️ ${compactSmsField(details.email, 80)}`);
    }
    if (details.message) {
        lines.push(`📝 ${compactSmsField(details.message, 120)}`);
    }

    lines.push(
        `📍 ${compactSmsField(source, 80)}`,
        `🔗 ${details.leadUrl}`,
    );

    return lines.join('\n');
}

/**
 * Build the Hebrew admin alert for a new business registration request.
 * User-provided fields are flattened and capped (same policy as the lead
 * alert) so a hostile payload cannot inflate the billable segment count.
 */
export function buildRegistrationNotificationSms(details: RegistrationSmsDetails): string {
    return [
        '👤 בקשת הרשמה חדשה לקריסטוליה',
        '',
        `שם: ${compactSmsField(details.contactName, 70)}`,
        `חברה: ${compactSmsField(details.companyName, 90)}`,
        `ח.פ./VAT: ${compactSmsField(details.vatNumber, 32)}`,
        `טלפון: ${compactSmsField(details.phone, 30)}`,
        `מייל: ${compactSmsField(details.email, 80)}`,
        `מדינה: ${compactSmsField(details.country, 40)}`,
        `הרשמה: ${details.method === 'google' ? 'Google' : 'סיסמה'}`,
        '',
        'לאישור:',
        details.registrationUrl,
    ].join('\n');
}

export function buildNewOrderNotificationSms(details: NewOrderSmsDetails): string {
    const lines = [
        '📦 הזמנה חדשה בקריסטוליה',
        `מספר: #${compactSmsField(details.orderId, 12)}`,
        `לקוח: ${compactSmsField(details.customerName, 70)}`,
        `חברה: ${compactSmsField(details.companyName, 90)}`,
    ];
    if (details.phone) lines.push(`טלפון: ${compactSmsField(details.phone, 30)}`);
    lines.push(
        `פריטים: ${details.itemCount}`,
        `סה״כ: ₪${details.totalAmount.toLocaleString('he-IL')}`,
        '',
        `לצפייה: ${details.orderUrl}`,
    );
    return lines.join('\n');
}

export function buildOrderStatusNotificationSms(details: OrderStatusSmsDetails): string {
    return [
        `שלום ${compactSmsField(details.customerName, 70)},`,
        `הזמנה #${compactSmsField(details.orderId, 12)} עודכנה: ${compactSmsField(details.statusLabel, 40)}.`,
        `סכום ההזמנה: ₪${details.totalAmount.toLocaleString('he-IL')}`,
        `לצפייה: ${details.dashboardUrl}`,
        'צוות Crystolia',
    ].join('\n');
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
    if (!isSmsTransportConfigured()) {
        return { success: false, error: 'Configuration missing' };
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.sms.accountSid)}/Messages.json`;
    // The Messaging Service (which carries the Alphanumeric Sender ID) takes
    // priority; Twilio rejects requests that combine MessagingServiceSid with
    // From, so only the phone-number fallback sends From. Only the destination
    // is a real phone number here — the service SID must never pass toE164().
    const payload = new URLSearchParams(
        config.sms.messagingServiceSid
            ? {
                To: toE164(to),
                MessagingServiceSid: config.sms.messagingServiceSid,
                Body: message,
            }
            : {
                To: toE164(to),
                From: toE164(config.sms.fromNumber),
                Body: message,
            },
    );

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
