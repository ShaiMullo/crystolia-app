// ===============================================
// 👤 User Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IRegistrationCompany {
    name: string;
    vatNumber: string;
    country: string; // ISO-3166 alpha-2 code
    phone?: string;
}

export interface IRegistrationNotifications {
    pendingEmailStatus?: 'sent' | 'failed' | 'skipped';
    pendingEmailAt?: Date;
    approvedEmailStatus?: 'sent' | 'failed' | 'skipped';
    approvedEmailAt?: Date;
    rejectedEmailStatus?: 'sent' | 'failed' | 'skipped';
    rejectedEmailAt?: Date;
    adminSmsStatus?: 'sent' | 'failed' | 'skipped';
    adminSmsAt?: Date;
}

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string; // Optional because we might not select it by default
    role: 'admin' | 'agent' | 'customer';
    options?: any; // For flexible options if needed

    // Profile
    avatar?: string;
    phone?: string;
    googleId?: string;
    contactRole?: string;

    // Company Relation
    company?: mongoose.Types.ObjectId; // Reference to Company
    isCompanyOwner: boolean;

    isActive: boolean;
    registrationStatus: 'pending' | 'approved' | 'rejected';
    registrationMethod?: 'password' | 'google';
    // Snapshot of the business details submitted at registration. The real
    // Company document is only created when an admin approves the request, so
    // a rejected registration never leaves an orphan Company behind and a
    // public registration can never attach itself to an existing Company.
    registrationCompany?: IRegistrationCompany;
    registrationFlags?: string[];
    registrationNotifications?: IRegistrationNotifications;
    preferredLocale: 'he' | 'en' | 'ru';
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
    approvalInProgressAt?: Date;
    approvalLock?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    mustChangePassword: boolean;
    tokenVersion: number;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't return password by default
            validate: {
                validator: function (v: string) {
                    // OAuth placeholder passwords bypass strength rules
                    if (v && v.startsWith('GOOGLE_OAUTH_')) return true;
                    // Require at least one uppercase letter and one number
                    return /[A-Z]/.test(v) && /[0-9]/.test(v);
                },
                message: 'Password must contain at least one uppercase letter and one number',
            },
        },
        role: {
            type: String,
            enum: ['admin', 'agent', 'customer'],
            default: 'customer', // Default for public registration
        },

        avatar: {
            type: String,
        },
        phone: {
            type: String,
            trim: true,
        },
        // Optional free-text role of the orderer inside their company, filled
        // during post-approval profile completion.
        contactRole: {
            type: String,
            trim: true,
            maxlength: 80,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allow null/undefined for non-Google users
        },

        // 🏢 Company Logic
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            // Validation: Required for 'customer' (except during onboarding), Forbidden for 'admin'/'agent'
            validate: {
                validator: function (this: IUser, v: any) {
                    // Start of change: Allow null for customers (handled in business logic/onboarding)
                    if (this.role === 'customer') {
                        return true;
                    }
                    // End of change
                    if (this.role === 'admin' || this.role === 'agent') {
                        return v == null; // Must NOT exist
                    }
                    return true;
                },
                message: (props) => {
                    const user = (props as any).instance as IUser;
                    // if (user.role === 'customer') return 'Company is required for customers'; // Removed strict check
                    return 'Company must be null for admin/agent';
                }
            }
        },
        isCompanyOwner: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        // Existing/admin-created users remain approved by default. Public
        // business registrations explicitly override this to "pending" and
        // stay inactive until an administrator approves or rejects them.
        registrationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'approved',
            index: true,
        },
        registrationMethod: {
            type: String,
            enum: ['password', 'google'],
        },
        registrationCompany: {
            type: new Schema<IRegistrationCompany>(
                {
                    name: { type: String, trim: true, required: true },
                    vatNumber: { type: String, trim: true, required: true },
                    country: { type: String, trim: true, uppercase: true, required: true },
                    phone: { type: String, trim: true },
                },
                { _id: false }
            ),
        },
        // Admin-facing review hints, e.g. 'possible-duplicate-vat'. Never
        // blocks the registration itself — flagged requests go to manual review.
        registrationFlags: {
            type: [String],
            default: undefined,
        },
        // Best-effort delivery bookkeeping for the admin registrations screen.
        // Never authoritative: a provider outage must not fail registration.
        registrationNotifications: {
            type: new Schema<IRegistrationNotifications>(
                {
                    pendingEmailStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
                    pendingEmailAt: { type: Date },
                    approvedEmailStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
                    approvedEmailAt: { type: Date },
                    rejectedEmailStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
                    rejectedEmailAt: { type: Date },
                    adminSmsStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
                    adminSmsAt: { type: Date },
                },
                { _id: false }
            ),
        },
        preferredLocale: {
            type: String,
            enum: ['he', 'en', 'ru'],
            default: 'he',
        },
        approvedAt: {
            type: Date,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectedAt: {
            type: Date,
        },
        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        // Short-lived internal lock used while materialising the Company and
        // activating a registration. It prevents approve/reject races and is
        // recoverable after a stale timeout if the process exits mid-flow.
        approvalInProgressAt: {
            type: Date,
            select: false,
        },
        approvalLock: {
            type: String,
            select: false,
        },
        // Soft delete — records are excluded from listings instead of removed,
        // preserving audit history and referential integrity.
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
        },
        // Set when an admin resets/changes a user's password; a later phase will
        // force a change on next login. Defaults false for all existing users —
        // no behavior change until enforcement (3e) ships.
        mustChangePassword: {
            type: Boolean,
            default: false,
        },
        // Bumped on password change / forced logout. New JWTs carry this value;
        // `protect` rejects tokens whose tokenVersion no longer matches. Tokens
        // issued before this field existed have no tokenVersion and are
        // grandfathered (accepted until they expire).
        tokenVersion: {
            type: Number,
            default: 0,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 Password Hashing Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password!, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔑 Methods
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password!);
};

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
