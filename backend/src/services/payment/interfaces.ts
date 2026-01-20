/**
 * Interface for Payment Providers (Strategy Pattern)
 */
export interface IPaymentProvider {
    /**
     * Provider name identifier
     */
    name: string;

    /**
     * Create a payment transaction page/token
     * @param amount Amount to charge
     * @param currency Currency code (default ILS)
     * @param orderId Internal Order ID
     * @param customerInfo Customer details for the provider
     */
    createPayment(
        amount: number,
        currency: string,
        orderId: string,
        customerInfo: {
            name: string;
            email: string;
            phone: string;
        }
    ): Promise<{
        redirectUrl: string; // URL to redirect the user to (Page or Checkout)
        transactionId?: string; // Provider's transaction ID (if available immediately)
        metadata?: any; // Any extra data
    }>;

    /**
     * Verify a webhook signature
     * @param payload Request body
     * @param headers Request headers
     */
    verifyWebhook(payload: any, headers: any): boolean;

    /**
     * Parse webhook payload to unified format
     */
    parseWebhook(payload: any): {
        orderId: string;
        transactionId: string;
        status: 'completed' | 'failed' | 'pending';
        raw: any;
    };
}
