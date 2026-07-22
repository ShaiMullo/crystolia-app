import { describe, it, expect } from 'vitest';
import { buildRegistrationNotificationSms } from '../services/smsService.js';

describe('buildRegistrationNotificationSms', () => {
    it('renders the Hebrew admin alert with all fields and the approval link', () => {
        const sms = buildRegistrationNotificationSms({
            contactName: 'ישראל ישראלי',
            companyName: 'חברת בדיקה בעמ',
            vatNumber: '515123456',
            phone: '052-1234567',
            email: 'new.business@example.com',
            country: 'ישראל',
            method: 'password',
            registrationUrl: 'https://admin.crystolia.com/admin/registrations/abc123',
        });

        expect(sms).toContain('👤 בקשת הרשמה חדשה לקריסטוליה');
        expect(sms).toContain('שם: ישראל ישראלי');
        expect(sms).toContain('חברה: חברת בדיקה בעמ');
        expect(sms).toContain('ח.פ./VAT: 515123456');
        expect(sms).toContain('טלפון: 052-1234567');
        expect(sms).toContain('מייל: new.business@example.com');
        expect(sms).toContain('מדינה: ישראל');
        expect(sms).toContain('הרשמה: סיסמה');
        expect(sms).toContain('https://admin.crystolia.com/admin/registrations/abc123');
    });

    it('labels Google registrations and caps hostile field lengths', () => {
        const sms = buildRegistrationNotificationSms({
            contactName: 'א'.repeat(500),
            companyName: 'ב'.repeat(500),
            vatNumber: '1'.repeat(100),
            phone: '0'.repeat(100),
            email: 'x@y.z',
            country: 'IL',
            method: 'google',
            registrationUrl: 'https://admin.crystolia.com/admin/registrations/1',
        });
        expect(sms).toContain('הרשמה: Google');
        expect(sms.length).toBeLessThan(600);
    });
});
