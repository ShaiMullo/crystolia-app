// ===============================================
// 📬 Lead Model - Enhanced
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ILead extends Document {
    name: string;
    phone: string;     // Normalized format (e.g., +972501234567)
    email?: string;
    message?: string;
    source?: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed' | 'archived';
    tags: string[];    // Flexible tagging
    assignedTo?: string;
    notes?: string;
    isDeleted: boolean; // Soft delete
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LeadSchema = new Schema<ILead>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true,
            unique: true, // Prevent duplicates
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
            index: true,
        },
        message: {
            type: String,
            trim: true,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        source: {
            type: String,
            default: 'website',
            index: true,
        },
        status: {
            type: String,
            enum: ['new', 'contacted', 'qualified', 'converted', 'closed', 'archived'],
            default: 'new',
            index: true,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        assignedTo: {
            type: String,
            trim: true,
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 Indexes & Hooks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Compound index for dashboard queries (Active leads by status)
LeadSchema.index({ status: 1, createdAt: -1, isDeleted: 1 });

// Text index for search
LeadSchema.index({ name: 'text', phone: 'text', email: 'text', message: 'text' });

// Pre-save hook to normalize phone numbers (basic implementation)
LeadSchema.pre('save', function (next) {
    if (this.isModified('phone')) {
        // Remove non-digit characters
        let normalized = this.phone.replace(/\D/g, '');

        // Basic IL normalization (050... -> 97250...)
        if (normalized.startsWith('05')) {
            normalized = '972' + normalized.substring(1);
        }

        this.phone = normalized;
    }
    next();
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
export default Lead;
