import { IPaymentProvider } from './interfaces.js';
import crypto from 'crypto';

/**
 * Hyp (Yaad) Payment Provider Implementation
 * Currently validates against local mock/sandbox logic
 */
export class HypProvider implements IPaymentProvider {
    name = 'hyp';
    private terminalId: string;
    private apiKey: string;

    constructor() {
        this.terminalId = process.env.PAYMENT_TERMINAL_ID || 'mock-terminal';
        this.apiKey = process.env.PAYMENT_API_KEY || 'mock-key';
    }

    /**
     * Simulate creating a payment page with Hyp
     */
    async createPayment(
        amount: number,
        currency: string = 'ILS',
        orderId: string,
        customerInfo: { name: string; email: string; phone: string }
    ): Promise<{ redirectUrl: string; transactionId?: string; metadata?: any }> {
        console.log(`[HypProvider] Creating payment for Order ${orderId}: ${amount} ${currency}`);

        // In a real implementation, you would:
        // 1. Sign the request payload with apiKey
        // 2. POST to https://icom.yaad.net/p/

        // Mock Logic: Return a fake checkout URL
        // We'll trust the client to redirect here.
        // In dev mode, we can redirect to a local success page or similar.

        const mockTransactionId = `hyp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Construct a payment page URL
        // For this mock, we'll assume the frontend has a page that simulates the payment flow
        // or we redirect to a dummy internal endpoint if needed.
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/checkout/mock-payment?orderId=${orderId}&amount=${amount}&currency=${currency}&provider=hyp`;

        return {
            redirectUrl,
            transactionId: mockTransactionId,
            metadata: { terminal: this.terminalId }
        };
    }

    /**
     * Verify Webhook Signature
     * Hyp usually sends a signature parameter or we validate IP.
     * For now, we'll validate a simple HMAC if provided, or return true for mock.
     */
    verifyWebhook(payload: any, headers: any): boolean {
        // Mock validation: Always true for now unless we enforce signatures
        return true;
    }

    /**
     * Parse incoming webhook data
     */
    parseWebhook(payload: any): {
        orderId: string;
        transactionId: string;
        status: 'completed' | 'failed' | 'pending';
        raw: any;
    } {
        // Hyp usually sends: Id, CCode (0=success), Amount, Order
        // Mock payload structure: { orderId, status, transId }

        const status = payload.status === 'success' || payload.CCode === '0'
            ? 'completed'
            : 'failed';

        return {
            orderId: payload.orderId || payload.Order,
            transactionId: payload.transactionId || payload.Id,
            status,
            raw: payload
        };
    }
}
