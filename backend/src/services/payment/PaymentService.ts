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

        // 3. Update Order - Automation Chain
        if (data.status === 'completed') {
            const order = await OrderModel.findById(data.orderId).populate('customer');

            if (order) {
                let invoiceData = { id: order.invoiceId, url: order.invoiceUrl };

                // A. Generate Invoice if not exists
                if (!order.invoiceId) {
                    try {
                        const { createInvoice, isGreenInvoiceConfigured } = await import('../greenInvoice.js');

                        if (isGreenInvoiceConfigured()) {
                            const customer = order.customer as any;
                            const newInvoice = await createInvoice({
                                client: {
                                    name: customer.businessName || customer.contactPerson || 'Customer',
                                    emails: customer.email ? [customer.email] : [],
                                    address: customer.address || '',
                                    city: customer.city || '',
                                    phone: customer.phone || '',
                                    taxId: customer.businessId || ''
                                },
                                items: order.items.map(item => ({
                                    description: `Product ${item.productType}`,
                                    quantity: item.quantity,
                                    price: item.unitPrice,
                                    currency: 'ILS'
                                })),
                                type: 320 // Tax Invoice
                            });

                            invoiceData = { id: newInvoice.id, url: newInvoice.url };
                            console.log(`✅ Invoice generated: ${invoiceData.id}`);
                        }
                    } catch (err) {
                        console.error('❌ Failed to generate invoice during webhook:', err);
                        // Don't fail the payment, just log
                    }
                }

                // B. Update Order
                await OrderModel.findByIdAndUpdate(data.orderId, {
                    $set: {
                        status: 'paid',
                        paymentStatus: 'PAID',
                        paidAt: new Date(),
                        invoiceId: invoiceData.id,
                        invoiceUrl: invoiceData.url
                    }
                });

                // C. Send Notification
                if (invoiceData.url) {
                    try {
                        const { notificationsService } = await import('../NotificationsService.js');
                        const customer = order.customer as any;

                        await notificationsService.sendOrderConfirmation(
                            { name: customer.contactPerson || customer.businessName, phone: customer.phone },
                            order._id.toString(),
                            invoiceData.url
                        );
                    } catch (notifyErr) {
                        console.error('❌ Failed to send notification:', notifyErr);
                    }
                }
            }
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
