import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for social login users
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['admin', 'customer', 'secretary'], default: 'customer' },
    googleId: { type: String },
    appleId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model('User', userSchema);
