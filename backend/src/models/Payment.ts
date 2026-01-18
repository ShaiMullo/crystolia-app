import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ILS' },
    provider: { type: String, enum: ['mock', 'meshulam', 'cardcom'], required: true },
    transactionId: { type: String }, // ID from the provider
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    metadata: { type: Map, of: String }, // Extra data from provider
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

export const PaymentModel = mongoose.model('Payment', paymentSchema);
