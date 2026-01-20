// ===============================================
// 📱 WhatsApp API Routes
// ===============================================

import { Router, Request, Response } from 'express';
import {
    sendTextMessage,
    sendTemplateMessage,
    verifyWebhook,
    processIncomingMessage,
    checkConfiguration,
    WebhookPayload,
} from '../services/whatsappService.js';

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 Status Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/status', (_req: Request, res: Response) => {
    const config = checkConfiguration();
    res.json({
        service: 'whatsapp',
        configured: config.configured,
        missing: config.missing,
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ Webhook Verification (GET)
// Meta sends this to verify the webhook endpoint
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] as string | undefined;
    const token = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge'] as string | undefined;

    const result = verifyWebhook(mode, token, challenge);

    if (result.valid && result.challenge) {
        // Meta expects the challenge to be returned as plain text
        res.status(200).send(result.challenge);
    } else {
        res.status(403).json({ error: 'Verification failed' });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📥 Webhook Incoming Messages (POST)
// Meta sends incoming messages here
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/webhook', async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload;

    // Meta requires immediate 200 OK response
    res.status(200).send('OK');

    // Process messages asynchronously
    try {
        if (payload.object === 'whatsapp_business_account') {
            const messages = processIncomingMessage(payload);

            for (const message of messages) {
                const from = message.from;
                const text = message.text?.body?.toLowerCase() || '';
                
                console.log(`📩 Incoming message from ${from}:`, message.text?.body || '[non-text message]');

                // Auto-reply based on keywords
                if (text.includes('שלום') || text.includes('hi') || text.includes('hello')) {
                    await sendTextMessage(from, 
                        `🌻 שלום! ברוכים הבאים ל-Crystolia!\n\nאיך אפשר לעזור?\n\n` +
                        `📦 הקלד "הזמנה" לבדיקת סטטוס הזמנה\n` +
                        `📞 הקלד "תמיכה" ליצירת קשר עם נציג\n` +
                        `💰 הקלד "מחירון" לקבלת מחירים`
                    );
                } else if (text.includes('הזמנה') || text.includes('order') || text.includes('status')) {
                    await sendTextMessage(from,
                        `📦 לבדיקת סטטוס הזמנה, אנא שלח את מספר ההזמנה שלך.\n\n` +
                        `או היכנס לאזור האישי באתר:\nhttps://crystolia.com/he/dashboard`
                    );
                } else if (text.includes('מחירון') || text.includes('price') || text.includes('מחיר')) {
                    await sendTextMessage(from,
                        `💰 מחירון שמן חמניות Crystolia:\n\n` +
                        `🫒 1 ליטר - ₪25\n` +
                        `🫒 5 ליטר - ₪110\n` +
                        `🫒 18 ליטר - ₪380\n\n` +
                        `להזמנה: https://crystolia.com`
                    );
                } else if (text.includes('תמיכה') || text.includes('support') || text.includes('עזרה')) {
                    await sendTextMessage(from,
                        `📞 צוות התמיכה שלנו יצור איתך קשר בהקדם!\n\n` +
                        `שעות פעילות: א'-ה' 09:00-18:00\n` +
                        `📧 support@crystolia.com`
                    );
                } else {
                    // Default response for unrecognized messages
                    await sendTextMessage(from,
                        `🌻 תודה על פנייתך!\n\n` +
                        `לא הבנתי את הבקשה. נסה:\n` +
                        `• "שלום" - תפריט ראשי\n` +
                        `• "הזמנה" - בדיקת סטטוס\n` +
                        `• "מחירון" - מחירים\n` +
                        `• "תמיכה" - יצירת קשר`
                    );
                }
            }
        }
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 Send Message (POST)
// Protected endpoint to send messages
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/send', async (req: Request, res: Response) => {
    const { to, message, type = 'text', templateName, languageCode } = req.body;

    // Validate required fields
    if (!to) {
        res.status(400).json({ error: 'Missing "to" phone number' });
        return;
    }

    try {
        let result;

        if (type === 'template') {
            if (!templateName) {
                res.status(400).json({ error: 'Missing "templateName" for template message' });
                return;
            }
            result = await sendTemplateMessage(to, templateName, languageCode);
        } else {
            if (!message) {
                res.status(400).json({ error: 'Missing "message" for text message' });
                return;
            }
            result = await sendTextMessage(to, message);
        }

        if (result.success) {
            res.json({
                success: true,
                messageId: result.messageId,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message',
        });
    }
});

export default router;
