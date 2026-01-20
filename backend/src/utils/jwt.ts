/**
 * JWT Utility Service
 * Real JWT token signing and verification
 */

import jwt from 'jsonwebtoken';

// Get JWT secret from environment or use default (for development only)
const JWT_SECRET = process.env.JWT_SECRET || 'crystolia-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Generate a signed JWT token
 */
export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: 604800, // 7 days in seconds
    } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        console.error('❌ JWT verification failed:', error);
        return null;
    }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export default {
    signToken,
    verifyToken,
    extractToken,
};
