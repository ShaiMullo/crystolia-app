// ===============================================
// 👤 User Model
// ===============================================

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string; // Optional because we might not select it by default
    role: 'admin' | 'agent' | 'customer';
    options?: any; // For flexible options if needed

    // Profile
    avatar?: string;
    googleId?: string;

    // Company Relation
    company?: mongoose.Types.ObjectId; // Reference to Company
    isCompanyOwner: boolean;

    isActive: boolean;
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
