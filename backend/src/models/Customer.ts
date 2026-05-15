// ===============================================
// 👥 Customer Model (CRM)
// ===============================================
// Wraps a Company with CRM-only metadata: assigned agent, status, tags,
// notes, source lead, lightweight totals. Orders/Invoices continue to
// reference Company directly — Customer never replaces that relationship.

import mongoose, { Document, Schema } from 'mongoose';

export type CustomerStatus = 'active' | 'inactive' | 'on-hold' | 'archived';

export interface ICustomerNote {
    text: string;
    createdAt: Date;
    actorId?: string;
}

export interface ICustomerTimelineEvent {
    type: string; // customer_created, customer_updated, status_changed, note_added, agent_assigned
    at: Date;
    actorId?: string;
    meta?: Record<string, unknown>;
}

export interface ICustomer extends Document {
    company: mongoose.Types.ObjectId;            // Required link to Company (billing identity)
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    status: CustomerStatus;
    tags: string[];
    notes: ICustomerNote[];
    timeline: ICustomerTimelineEvent[];

    assignedTo?: mongoose.Types.ObjectId;        // Agent / Admin user
    sourceLeadId?: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;

    lastContactAt?: Date;
    totalOrders: number;
    totalRevenue: number;

    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company is required'],
            unique: true,
            index: true,
        },
        contactName: { type: String, trim: true, maxlength: 120 },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        contactPhone: { type: String, trim: true },
        status: {
            type: String,
            enum: ['active', 'inactive', 'on-hold', 'archived'],
            default: 'active',
            index: true,
        },
        tags: { type: [String], default: [], index: true },
        notes: [{
            text: { type: String, required: true, maxlength: 4000 },
            createdAt: { type: Date, default: Date.now },
            actorId: { type: String },
        }],
        timeline: [{
            type: { type: String, required: true },
            at: { type: Date, default: Date.now },
            actorId: { type: String },
            meta: { type: Schema.Types.Mixed },
        }],
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        sourceLeadId: {
            type: Schema.Types.ObjectId,
            ref: 'Lead',
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        lastContactAt: { type: Date, index: true },
        totalOrders: { type: Number, default: 0, min: 0 },
        totalRevenue: { type: Number, default: 0, min: 0 },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
    },
    { timestamps: true },
);

// Compound index for the common admin list query
CustomerSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
export default Customer;
