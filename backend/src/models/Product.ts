// ===============================================
// 📦 Product Model (catalog)
// ===============================================
// Catalog of sellable items. Inventory is tracked separately via the
// Inventory model so that a single product can have stock across many
// warehouses without duplicating the catalog row.

import mongoose, { Document, Schema } from 'mongoose';

export type ProductUnit = 'unit' | 'box' | 'liter' | 'kg' | 'gram' | 'package';

export interface IProduct extends Document {
    name: string;
    sku: string;
    category?: string;
    description?: string;
    unit: ProductUnit;
    price: number;
    currency: string;
    taxRate: number;          // e.g. 17 for 17% (Israel default), 0 for tax-exempt
    isActive: boolean;
    stockTrackingEnabled: boolean;
    tags: string[];
    createdBy?: mongoose.Types.ObjectId;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
    {
        name: { type: String, required: true, trim: true, maxlength: 200, index: true },
        sku: { type: String, required: true, trim: true, unique: true, index: true },
        category: { type: String, trim: true, maxlength: 80, index: true },
        description: { type: String, trim: true, maxlength: 2000 },
        unit: {
            type: String,
            enum: ['unit', 'box', 'liter', 'kg', 'gram', 'package'],
            default: 'unit',
        },
        price: { type: Number, required: true, min: 0, default: 0 },
        currency: { type: String, default: 'ILS', uppercase: true, maxlength: 6 },
        taxRate: { type: Number, default: 17, min: 0, max: 100 },
        isActive: { type: Boolean, default: true, index: true },
        stockTrackingEnabled: { type: Boolean, default: true },
        tags: { type: [String], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
    },
    { timestamps: true },
);

ProductSchema.index({ isDeleted: 1, isActive: 1, name: 1 });
ProductSchema.index({ name: 'text', sku: 'text', category: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
