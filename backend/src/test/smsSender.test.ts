// Sender-selection tests for sendSms: Messaging Service SID (Alphanumeric
// Sender "Crystolia") vs. legacy phone-number fallback. config/index.ts reads
// the environment once at import time, so instead of dynamic imports these
// tests mutate the exported config.sms object and restore it after each test.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../config/index.js';
import { isSmsTransportConfigured, sendSms } from '../services/smsService.js';

const MESSAGING_SERVICE_SID = 'MGtest00000000000000000000000000';

function mockHttpClient(response: unknown = { data: { sid: 'SM123' } }) {
    return { post: vi.fn().mockResolvedValue(response) };
}

function sentParams(client: { post: ReturnType<typeof vi.fn> }): URLSearchParams {
    expect(client.post).toHaveBeenCalledTimes(1);
    return new URLSearchParams(String(client.post.mock.calls[0][1]));
}

describe('sendSms sender selection', () => {
    const originalSms = { ...config.sms };

    beforeEach(() => {
        config.sms.accountSid = 'ACtest';
        config.sms.authToken = 'token';
        config.sms.messagingServiceSid = '';
        config.sms.fromNumber = '';
    });

    afterEach(() => {
        Object.assign(config.sms, originalSms);
    });

    it('sends via the Messaging Service SID when configured, without From', async () => {
        config.sms.messagingServiceSid = MESSAGING_SERVICE_SID;
        const client = mockHttpClient();

        const result = await sendSms('+972500000000', 'hello', client);

        expect(result).toEqual({ success: true, messageId: 'SM123' });
        const params = sentParams(client);
        expect(params.get('MessagingServiceSid')).toBe(MESSAGING_SERVICE_SID);
        expect(params.has('From')).toBe(false);
        expect(params.get('To')).toBe('+972500000000');
        expect(params.get('Body')).toBe('hello');
    });

    it('falls back to the phone number when no Messaging Service SID is set', async () => {
        config.sms.fromNumber = '+15550000000';
        const client = mockHttpClient();

        const result = await sendSms('+972500000000', 'hello', client);

        expect(result.success).toBe(true);
        const params = sentParams(client);
        expect(params.get('From')).toBe('+15550000000');
        expect(params.has('MessagingServiceSid')).toBe(false);
    });

    it('prefers the Messaging Service when both sender options are configured', async () => {
        config.sms.messagingServiceSid = MESSAGING_SERVICE_SID;
        config.sms.fromNumber = '+15550000000';
        const client = mockHttpClient();

        await sendSms('+972500000000', 'hello', client);

        const params = sentParams(client);
        expect(params.get('MessagingServiceSid')).toBe(MESSAGING_SERVICE_SID);
        expect(params.has('From')).toBe(false);
    });

    it('normalizes a local Israeli destination number to E.164', async () => {
        config.sms.messagingServiceSid = MESSAGING_SERVICE_SID;
        const client = mockHttpClient();

        await sendSms('052-1234567', 'hello', client);

        expect(sentParams(client).get('To')).toBe('+972521234567');
    });

    it('reports configuration missing when neither sender option exists', async () => {
        const client = mockHttpClient();

        expect(isSmsTransportConfigured()).toBe(false);
        const result = await sendSms('+972500000000', 'hello', client);

        expect(result).toEqual({ success: false, error: 'Configuration missing' });
        expect(client.post).not.toHaveBeenCalled();
    });

    it('treats either sender option alone as a configured transport', () => {
        config.sms.messagingServiceSid = MESSAGING_SERVICE_SID;
        expect(isSmsTransportConfigured()).toBe(true);

        config.sms.messagingServiceSid = '';
        config.sms.fromNumber = '+15550000000';
        expect(isSmsTransportConfigured()).toBe(true);
    });

    it('returns a failure result instead of throwing when the provider errors', async () => {
        config.sms.messagingServiceSid = MESSAGING_SERVICE_SID;
        const client = { post: vi.fn().mockRejectedValue(new Error('twilio down')) };

        const result = await sendSms('+972500000000', 'hello', client);

        expect(result.success).toBe(false);
        expect(result.error).toBe('twilio down');
    });
});
