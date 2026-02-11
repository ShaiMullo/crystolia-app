// ===============================================
// ✅ Validation Utilities
// ===============================================

export const validate = {
    phone: (phone: string): boolean => {
        // Basic IL phone validation (9-10 digits)
        const phoneRegex = /^05\d-?\d{7}$/;
        return phoneRegex.test(phone) || /^\d{9,15}$/.test(phone);
    },

    email: (email: string): boolean => {
        const emailRegex = /^\S+@\S+\.\S+$/;
        return emailRegex.test(email);
    },

    objectId: (id: string): boolean => {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        return objectIdRegex.test(id);
    }
};

export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
