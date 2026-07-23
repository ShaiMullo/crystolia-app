import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config/index.js';
import { isEmailConfigured, sendEmail } from '../services/emailService.js';

const originalEmail = { ...config.email };
const originalSms = { ...config.sms };

beforeEach(() => {
    Object.assign(config.email, {
        provider: 'twilio',
        apiKey: '',
        fromAddress: 'admin@crystolia.com',
        fromName: 'Crystolia',
        replyTo: 'admin@crystolia.com',
    });
    Object.assign(config.sms, {
        accountSid: 'AC_test',
        authToken: 'test-token',
        fromNumber: '+10000000000',
    });
});

afterEach(() => {
    Object.assign(config.email, originalEmail);
    Object.assign(config.sms, originalSms);
    vi.restoreAllMocks();
});

describe('transactional email providers', () => {
    it('sends through Twilio Email with the existing account credentials', async () => {
        const post = vi.fn().mockResolvedValue({
            status: 202,
            data: { operationId: 'comms_operation_test' },
        });

        expect(isEmailConfigured()).toBe(true);
        const result = await sendEmail(
            'customer@example.com',
            'Subject',
            { text: 'Plain body', html: '<p>HTML body</p>' },
            { post } as never,
        );

        expect(result).toEqual({ success: true });
        expect(post).toHaveBeenCalledWith(
            'https://comms.twilio.com/v1/Emails',
            {
                from: { address: 'admin@crystolia.com', name: 'Crystolia' },
                to: [{ address: 'customer@example.com' }],
                content: {
                    subject: 'Subject',
                    text: 'Plain body',
                    html: '<p>HTML body</p>',
                },
            },
            expect.objectContaining({
                auth: { username: 'AC_test', password: 'test-token' },
                headers: { 'Content-Type': 'application/json' },
            }),
        );
    });

    it('keeps the legacy SendGrid provider available when selected explicitly', async () => {
        Object.assign(config.email, {
            provider: 'sendgrid',
            apiKey: 'SG.test',
        });
        const post = vi.fn().mockResolvedValue({ status: 202 });

        expect(isEmailConfigured()).toBe(true);
        const result = await sendEmail(
            'customer@example.com',
            'Subject',
            { text: 'Plain body', html: '<p>HTML body</p>' },
            { post } as never,
        );

        expect(result).toEqual({ success: true });
        expect(post).toHaveBeenCalledWith(
            'https://api.sendgrid.com/v3/mail/send',
            expect.objectContaining({
                personalizations: [{ to: [{ email: 'customer@example.com' }], subject: 'Subject' }],
            }),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer SG.test' }),
            }),
        );
    });

    it('reports missing configuration for the selected provider', () => {
        config.sms.authToken = '';
        expect(isEmailConfigured()).toBe(false);

        config.email.provider = 'sendgrid';
        config.email.apiKey = '';
        expect(isEmailConfigured()).toBe(false);
    });
});
