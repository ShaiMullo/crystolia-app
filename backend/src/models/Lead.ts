// ===============================================
// 📬 Lead Model - CRM Enhanced
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Sub-document interfaces
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ITimelineEvent {
    type: string;   // lead_created, status_changed, note_added, whatsapp_notified, sms_notified, notification_failed, ...
    at: Date;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface INote {
    text: string;
    createdAt: Date;
    actorId?: string;
}

export interface IMessage {
    content: string;
    source: string;
    createdAt: Date;
}

export interface IOnboarding {
    currentStep: number;
    completed: boolean;
    completedAt?: Date;
    data: Record<string, unknown>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Main Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'converted' | 'closed' | 'archived' | 're-engaged';

export interface ILead extends Document {
    name: string;
    phone: string;
    email?: string;
    message?: string;
    source?: string;
    // Website attribution (public contact form) — all optional & additive.
    locale?: string;
    sourceDomain?: string;
    sourcePage?: string;
    utm?: Record<string, string>;
    // Idempotent public submissions — see routes/leads.ts.
    submissionId?: string;
    lastSubmissionId?: string;
    status: LeadStatus;
    tags: string[];
    assignedTo?: string;

    // CRM fields
    contactCount: number;
    lastContactAt: Date;
    ownerId?: string;
    messages: IMessage[];
    timeline: ITimelineEvent[];
    notes: INote[];
    onboarding: IOnboarding;

    // Conversion tracking — set when lead is converted to a paying customer
    convertedToCompanyId?: mongoose.Types.ObjectId;
    convertedToUserId?: mongoose.Types.ObjectId;
    customerId?: mongoose.Types.ObjectId;
    convertedAt?: Date;

    // Soft delete
    isDeleted: boolean;
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
            index: true,
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
        // Website attribution (public contact form). Optional/additive — the
        // route whitelists and caps these before they reach the model.
        locale: {
            type: String,
            trim: true,
            maxlength: [8, 'Locale cannot exceed 8 characters'],
        },
        sourceDomain: {
            type: String,
            trim: true,
            maxlength: [100, 'Source domain cannot exceed 100 characters'],
        },
        sourcePage: {
            type: String,
            trim: true,
            maxlength: [300, 'Source page cannot exceed 300 characters'],
        },
        utm: {
            type: Schema.Types.Mixed,
        },
        // Idempotency key of the submission that CREATED this lead. Unique +
        // sparse: only documents that have the field participate in the index,
        // so existing data can never conflict and no migration is needed —
        // while two concurrent creates with the same key still collide (the
        // route turns that E11000 into an idempotent success replay).
        submissionId: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },
        // Idempotency key of the last submission APPLIED to this lead —
        // atomically claimed on the update path so a duplicated request can't
        // double-increment contactCount or double-notify. Indexed: the replay
        // pre-check queries it on every public POST.
        lastSubmissionId: {
            type: String,
            trim: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'converted', 'closed', 'archived', 're-engaged'],
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

        // CRM Fields
        contactCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        lastContactAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        ownerId: {
            type: String,
            trim: true,
            index: true,
        },
        messages: [{
            content: { type: String },
            source: { type: String },
            createdAt: { type: Date, default: Date.now },
        }],
        timeline: [{
            type: { type: String },
            at: { type: Date, default: Date.now },
            actorId: { type: String },
            meta: { type: Schema.Types.Mixed },
        }],
        notes: [{
            text: { type: String },
            createdAt: { type: Date, default: Date.now },
            actorId: { type: String },
        }],
        onboarding: {
            currentStep: { type: Number, default: 1 },
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
            data: { type: Schema.Types.Mixed, default: {} },
        },

        // Conversion tracking
        convertedToCompanyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            index: true,
        },
        convertedToUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'Customer',
            index: true,
        },
        convertedAt: {
            type: Date,
        },

        // Soft delete
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

// Compound index for dashboard queries
LeadSchema.index({ status: 1, createdAt: -1, isDeleted: 1 });

// Text index for search
LeadSchema.index({ name: 'text', phone: 'text', email: 'text', message: 'text' });

// Pre-save hook to normalize phone numbers
LeadSchema.pre('save', function (next) {
    if (this.isModified('phone')) {
        let normalized = this.phone.replace(/\D/g, '');
        if (normalized.startsWith('05')) {
            normalized = '972' + normalized.substring(1);
        }
        this.phone = normalized;
    }
    next();
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
export default Lead;
