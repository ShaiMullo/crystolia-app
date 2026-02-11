// ===============================================
// 🔧 Configuration Module
// ===============================================
// Centralized, env-driven configuration for production readiness

import { SignOptions } from 'jsonwebtoken';

interface Config {
    // Server
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    adminPhone: string;

    // Database
    mongoUri: string;

    // WhatsApp
    whatsapp: {
        accessToken: string;
        phoneNumberId: string;
        webhookVerifyToken: string;
    };

    // Production settings
    server: {
        requestTimeout: number;      // Request timeout in ms
        keepAliveTimeout: number;    // Keep-alive timeout in ms
        headersTimeout: number;      // Headers timeout in ms
    };

    // Security
    jwtSecret: string;
    jwtExpiresIn: SignOptions['expiresIn'];
    cookieExpiresIn: number;

    // Google OAuth
    google: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
}

// Strict JWT_SECRET check
console.log('🔍 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    Keys: Object.keys(process.env).filter(k => !k.startsWith('npm_')),
    HasJwtSecret: !!process.env.JWT_SECRET
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

function getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

function getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        console.warn(`⚠️ Warning: ${key} is not set`);
        return '';
    }
    return value;
}

export const config: Config = {
    // Server
    port: parseInt(getEnvOrDefault('PORT', '4000'), 10),
    nodeEnv: getEnvOrDefault('NODE_ENV', 'development'),
    frontendUrl: getEnvOrDefault('FRONTEND_URL', 'http://localhost:3000'),
    adminPhone: getEnvOrDefault('ADMIN_PHONE', ''),

    // Database
    mongoUri: getEnvOrDefault('MONGO_URI', 'mongodb://localhost:27017/crystolia'),

    // WhatsApp (optional in development)
    whatsapp: {
        accessToken: getEnvOrThrow('WHATSAPP_ACCESS_TOKEN'),
        phoneNumberId: getEnvOrThrow('WHATSAPP_PHONE_NUMBER_ID'),
        webhookVerifyToken: getEnvOrThrow('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    },

    // Production settings
    server: {
        requestTimeout: parseInt(getEnvOrDefault('REQUEST_TIMEOUT', '30000'), 10),
        keepAliveTimeout: parseInt(getEnvOrDefault('KEEP_ALIVE_TIMEOUT', '65000'), 10),
        headersTimeout: parseInt(getEnvOrDefault('HEADERS_TIMEOUT', '66000'), 10),
    },

    // Security
    jwtSecret: JWT_SECRET,
    // We cast here because jsonwebtoken expects a specific StringValue type, but process.env gives generic string.
    // This is safe because '1d' is a valid duration.
    jwtExpiresIn: getEnvOrDefault('JWT_EXPIRES_IN', '1d') as SignOptions['expiresIn'],
    cookieExpiresIn: parseInt(getEnvOrDefault('JWT_COOKIE_EXPIRES_IN', '1'), 10),

    // Google OAuth (Optional in Dev, Required in Prod)
    google: {
        clientId: getEnvOrDefault('GOOGLE_CLIENT_ID', ''),
        clientSecret: getEnvOrDefault('GOOGLE_CLIENT_SECRET', ''),
        callbackUrl: getEnvOrDefault('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/auth/google/callback'),
    },
};

export function isDevelopment(): boolean {
    return config.nodeEnv === 'development';
}

export function isProduction(): boolean {
    return config.nodeEnv === 'production';
}

export default config;
