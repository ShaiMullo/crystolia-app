// ===============================================
// ⚙️ Settings Model
// ===============================================
// One global document per key (e.g. 'business').
// Upserted via PUT /api/settings — never duplicated.

import mongoose, { Document, Schema } from 'mongoose';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interfaces
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IBoxPrice {
    label: string;
    sku: string;
    pricePerUnit: number;
    isActive: boolean;
}

export interface ISettings extends Document {
    key: string;
    minimumOrderAmount: number;
    boxPrices: IBoxPrice[];
    currency: string;
    paymentOptions: {
        bankTransfer: {
            enabled: boolean;
            bankName?: string;
            branch?: string;
            accountNumber?: string;
            accountName?: string;
            iban?: string;
            swift?: string;
            bankAddress?: string;
        };
        creditCard: {
            enabled: boolean;
            paymentUrl?: string;
        };
    };
    /**
     * Owner verification of the saved bank-transfer details. Holds ONLY a
     * SHA-256 fingerprint of the verified fields (never the values). Cleared
     * automatically whenever a save changes any covered bank field, so a
     * verification can never outlive the details it attested to.
     */
    bankVerification?: {
        fingerprint: string;
        verifiedAt: Date;
        verifiedBy: mongoose.Types.ObjectId;
    } | null;
    updatedBy?: mongoose.Types.ObjectId;
    updatedAt: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BoxPriceSchema = new Schema<IBoxPrice>(
    {
        label: { type: String, required: true, trim: true },
        sku: { type: String, required: true, trim: true },
        pricePerUnit: { type: Number, required: true, min: 0 },
        isActive: { type: Boolean, default: true },
    },
    { _id: false }
);

const SettingsSchema = new Schema<ISettings>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: 'business',
        },
        minimumOrderAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        boxPrices: {
            type: [BoxPriceSchema],
            default: [],
        },
        currency: {
            type: String,
            required: true,
            default: 'ILS',
        },
        paymentOptions: {
            bankTransfer: {
                enabled: { type: Boolean, default: false },
                bankName: { type: String, trim: true, maxlength: 120 },
                branch: { type: String, trim: true, maxlength: 40 },
                accountNumber: { type: String, trim: true, maxlength: 60 },
                accountName: { type: String, trim: true, maxlength: 120 },
                iban: { type: String, trim: true, maxlength: 60 },
                swift: { type: String, trim: true, maxlength: 11 },
                bankAddress: { type: String, trim: true, maxlength: 240 },
            },
            creditCard: {
                enabled: { type: Boolean, default: false },
                paymentUrl: { type: String, trim: true, maxlength: 2000 },
            },
        },
        bankVerification: {
            type: new Schema(
                {
                    fingerprint: { type: String, required: true, maxlength: 64 },
                    verifiedAt: { type: Date, required: true },
                    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                },
                { _id: false }
            ),
            default: null,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
export default Settings;
