// ===============================================
// 🏢 Company Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ICompany extends Document {
    name: string;
    billingEmail?: string; // Legacy?
    email?: string; // Contact email
    billingAddress?: string; // Legacy?
    address?: string;
    city?: string;
    country?: string; // ISO-3166 alpha-2 code
    vatNumber?: string;
    phone?: string;
    owner?: mongoose.Types.ObjectId; // Optional for backward compatibility
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CompanySchema = new Schema<ICompany>(
    {
        name: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            unique: true, // Company names must be unique
        },
        billingEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        billingAddress: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            trim: true,
            uppercase: true,
        },
        vatNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
export default Company;
