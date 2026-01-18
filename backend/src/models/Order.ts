import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productType: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    invoiceId: { type: String }, // Green Invoice document ID
    invoiceUrl: { type: String }, // Link to invoice PDF
    createdAt: { type: Date, default: Date.now }
});

export const OrderModel = mongoose.model('Order', orderSchema);
