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
