import { describe, expect, it } from 'vitest';
import {
    buildNewOrderNotificationSms,
    buildOrderStatusNotificationSms,
} from '../services/smsService.js';

describe('order SMS copy', () => {
    it('builds an admin alert with the order details and deep link', () => {
        const sms = buildNewOrderNotificationSms({
            orderId: 'ABC12345',
            customerName: 'ישראל ישראלי',
            companyName: 'בדיקה בע״מ',
            phone: '0521234567',
            itemCount: 3,
            totalAmount: 1250,
            orderUrl: 'https://admin.crystolia.com/admin/orders/123',
        });

        expect(sms).toContain('הזמנה חדשה');
        expect(sms).toContain('ABC12345');
        expect(sms).toContain('בדיקה בע״מ');
        expect(sms).toContain('1,250');
        expect(sms).toContain('https://admin.crystolia.com/admin/orders/123');
    });

    it('builds a customer status alert without exposing arbitrary line breaks', () => {
        const sms = buildOrderStatusNotificationSms({
            customerName: 'ישראל\nישראלי',
            orderId: 'ABC12345',
            statusLabel: 'יצאה למשלוח',
            totalAmount: 120,
            dashboardUrl: 'https://business.crystolia.com/he/dashboard',
        });

        expect(sms).toContain('ישראל ישראלי');
        expect(sms).toContain('יצאה למשלוח');
        expect(sms).toContain('https://business.crystolia.com/he/dashboard');
    });
});
