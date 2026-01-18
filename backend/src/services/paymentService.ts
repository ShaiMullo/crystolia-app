
/**
 * Payment Service Adapter Pattern
 */

interface CheckoutRequest {
    orderId: string;
    amount: number;
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    successUrl: string;
    cancelUrl: string;
}

interface CheckoutResponse {
    paymentId: string;
    redirectUrl: string; // URL to redirect user to (Meshulam page or Mock page)
}

interface PaymentProvider {
    createCheckout(req: CheckoutRequest): Promise<CheckoutResponse>;
    verifyTransaction(transactionId: string): Promise<boolean>;
}

// -----------------------------------------------------
// Mock Provider (For Dev)
// -----------------------------------------------------
class MockPaymentProvider implements PaymentProvider {
    async createCheckout(req: CheckoutRequest): Promise<CheckoutResponse> {
        console.log("Mock Checkout Created:", req);
        // In a real app, this might redirect to a local internal page
        // For now, we'll confirm immediately or return a dummy URL
        return {
            paymentId: "mock_tx_" + Date.now(),
            redirectUrl: `${req.successUrl}?transactionId=mock_tx_${Date.now()}`
        };
    }

    async verifyTransaction(transactionId: string): Promise<boolean> {
        console.log("Mock Verify:", transactionId);
        return true;
    }
}

// -----------------------------------------------------
// Meshulam Provider (Placeholder)
// -----------------------------------------------------
class MeshulamPaymentProvider implements PaymentProvider {
    async createCheckout(req: CheckoutRequest): Promise<CheckoutResponse> {
        // TODO: Implement actual Meshulam API call
        console.log("Meshulam Checkout (Not Implemented yet)");
        throw new Error("Meshulam provider not configured");
    }

    async verifyTransaction(transactionId: string): Promise<boolean> {
        return false;
    }
}

// -----------------------------------------------------
// Payment Service Factory
// -----------------------------------------------------
class PaymentService {
    private provider: PaymentProvider;

    constructor() {
        const providerType = process.env.PAYMENT_PROVIDER || 'mock';
        if (providerType === 'meshulam') {
            this.provider = new MeshulamPaymentProvider();
        } else {
            this.provider = new MockPaymentProvider();
        }
    }

    async initiatePayment(req: CheckoutRequest) {
        return this.provider.createCheckout(req);
    }

    async verifyPayment(transactionId: string) {
        return this.provider.verifyTransaction(transactionId);
    }
}

export const paymentService = new PaymentService();
