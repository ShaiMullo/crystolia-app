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

router.post('/webhook', (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload;

    // Meta requires immediate 200 OK response
    res.status(200).send('OK');

    // Process messages asynchronously
    try {
        if (payload.object === 'whatsapp_business_account') {
            const messages = processIncomingMessage(payload);

            for (const message of messages) {
                console.log(`📩 Incoming message from ${message.from}:`, message.text?.body || '[non-text message]');

                // TODO: Add your message handling logic here
                // Examples:
                // - Save to database
                // - Trigger notifications
                // - Auto-reply
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
