import { IPaymentProvider } from './interfaces.js';
import { HypProvider } from './HypProvider.js';
import { PaymentModel } from '../../models/Payment.js';
import { OrderModel } from '../../models/Order.js';

export class PaymentService {
    private strategies: Map<string, IPaymentProvider>;

    constructor() {
        this.strategies = new Map();

        // Register Providers
        const hyp = new HypProvider();
        this.strategies.set('hyp', hyp);
        this.strategies.set('mock', hyp); // Alias for now
    }

    /**
     * Get a provider by name
     */
    private getProvider(name: string): IPaymentProvider {
        const provider = this.strategies.get(name);
        if (!provider) {
            throw new Error(`Payment provider '${name}' not found`);
        }
        return provider;
    }

    /**
     * Initiate a payment transaction
     */
    async createPayment(
        providerName: string,
        orderId: string,
        amount: number,
        customerInfo: { name: string; email: string; phone: string; id: string }
    ) {
        const provider = this.getProvider(providerName);

        // 1. Create initial payment log
        const paymentLog = new PaymentModel({
            order: orderId,
            customer: customerInfo.id,
            amount,
            currency: 'ILS',
            provider: provider.name,
            status: 'pending'
        });
        await paymentLog.save();

        try {
            // 2. Call provider
            const result = await provider.createPayment(
                amount,
                'ILS',
                orderId,
                customerInfo
            );

            // 3. Update log with transaction ID if available
            if (result.transactionId) {
                paymentLog.transactionId = result.transactionId;
                paymentLog.metadata = new Map(Object.entries(result.metadata || {}));
                await paymentLog.save();
            }

            // 4. Update Order status
            await OrderModel.findByIdAndUpdate(orderId, {
                $set: {
                    transactionId: result.transactionId || paymentLog._id, // Fallback to internal ID
                    paymentStatus: 'PENDING'
                }
            });

            return result;
        } catch (error) {
            paymentLog.status = 'failed';
            await paymentLog.save();
            throw error;
        }
    }

    /**
     * Process incoming webhook
     */
    async handleWebhook(providerName: string, payload: any, headers: any) {
        const provider = this.getProvider(providerName);

        // 1. Verify signature
        if (!provider.verifyWebhook(payload, headers)) {
            throw new Error('Invalid webhook signature');
        }

        // 2. Parse payload
        const data = provider.parseWebhook(payload);
        console.log(`[PaymentService] Webhook received for Order ${data.orderId}: ${data.status}`);

        // 3. Update Order
        if (data.status === 'completed') {
            await OrderModel.findByIdAndUpdate(data.orderId, {
                $set: {
                    status: 'paid', // Update main status to paid
                    paymentStatus: 'PAID',
                    paidAt: new Date()
                }
            });

            // TODO: Trigger Invoice creation here (Green Invoice) if not already done
        } else if (data.status === 'failed') {
            await OrderModel.findByIdAndUpdate(data.orderId, {
                $set: { paymentStatus: 'FAILED' }
            });
        }

        // 4. Update Payment Log (Find by transactionId or Order)
        // Try finding by explicit transaction ID first
        let paymentLog = await PaymentModel.findOne({ transactionId: data.transactionId });

        // Fallback: Find latest pending/initiated payment for this order
        if (!paymentLog) {
            paymentLog = await PaymentModel.findOne({ order: data.orderId }).sort({ createdAt: -1 });
        }

        if (paymentLog) {
            paymentLog.status = data.status;
            paymentLog.completedAt = new Date();
            // Store raw webhook data for debugging
            const currentMetadata = paymentLog.metadata ? Object.fromEntries(paymentLog.metadata) : {};
            paymentLog.metadata = new Map(Object.entries({
                ...currentMetadata,
                webhookRaw: JSON.stringify(data.raw).substring(0, 1000) // Limit size
            }));
            await paymentLog.save();
        }

        return { success: true, orderId: data.orderId };
    }
}

// Singleton Instance
export const paymentService = new PaymentService();
