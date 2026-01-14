import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: {
        street: String,
        city: String,
        zip: String
    },
    pricingTier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum', 'enterprise'], default: 'standard' },
    createdAt: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link to auth user
});

export const CustomerModel = mongoose.model('Customer', customerSchema);
