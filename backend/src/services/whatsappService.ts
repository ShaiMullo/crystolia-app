// ===============================================
// 📱 WhatsApp Cloud API Service
// ===============================================

import axios, { AxiosError } from 'axios';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: {
        body: string;
    };
}

export interface WebhookPayload {
    object: string;
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: { name: string };
                    wa_id: string;
                }>;
                messages?: WhatsAppMessage[];
            };
            field: string;
        }>;
    }>;
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Send Text Message
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendTextMessage(
    to: string,
    message: string
): Promise<SendMessageResult> {
    try {
        const response = await axios.post(
            `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`✅ Message sent to ${to}`);
        return {
            success: true,
            messageId: response.data.messages?.[0]?.id,
        };
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('❌ Failed to send message:', axiosError.response?.data || axiosError.message);
        return {
            success: false,
            error: axiosError.message,
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Send Template Message
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'he',
    components?: Array<{
        type: string;
        parameters: Array<{ type: string; text: string }>;
    }>
): Promise<SendMessageResult> {
    try {
        const response = await axios.post(
            `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode,
                    },
                    components: components,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`✅ Template "${templateName}" sent to ${to}`);
        return {
            success: true,
            messageId: response.data.messages?.[0]?.id,
        };
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('❌ Failed to send template:', axiosError.response?.data || axiosError.message);
        return {
            success: false,
            error: axiosError.message,
        };
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ Verify Webhook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined
): { valid: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully');
        return { valid: true, challenge };
    }
    console.warn('⚠️ Webhook verification failed');
    return { valid: false };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📥 Process Incoming Message
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function processIncomingMessage(payload: WebhookPayload): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = [];

    for (const entry of payload.entry) {
        for (const change of entry.changes) {
            if (change.value.messages) {
                messages.push(...change.value.messages);
            }
        }
    }

    return messages;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 Check Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function checkConfiguration(): { configured: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!ACCESS_TOKEN) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!WEBHOOK_VERIFY_TOKEN) missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    return {
        configured: missing.length === 0,
        missing,
    };
}
