import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    businessId: { type: String }, // ח.פ / מספר עוסק
    contactPerson: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pricingTier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum', 'enterprise'], default: 'standard' },
    onboardingComplete: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link to auth user
});

export const CustomerModel = mongoose.model('Customer', customerSchema);
