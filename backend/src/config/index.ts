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
    adminFrontendUrl: string;
    adminPhone: string;

    // Database
    mongoUri: string;

    // WhatsApp (UltraMsg)
    whatsapp: {
        provider: 'ultramsg';
        instanceId: string;
        token: string;
        baseUrl: string;
    };

    // SMS (Twilio)
    sms: {
        provider: 'twilio';
        accountSid: string;
        authToken: string;
        fromNumber: string;
    };

    // Transactional email (Twilio SendGrid)
    email: {
        provider: 'sendgrid';
        apiKey: string;
        fromAddress: string;
        fromName: string;
        replyTo: string;
    };

    // Green Invoice
    greenInvoice: {
        apiId: string;
        secret: string;
        sandbox: boolean;
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

    // Production Security
    corsOrigins: string[];
    cookieDomain?: string;
    secureCookie: boolean;
}

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
    adminFrontendUrl: getEnvOrDefault('ADMIN_FRONTEND_URL', 'http://localhost:3001'),
    adminPhone: getEnvOrDefault('ADMIN_PHONE_NUMBER', ''),

    // Database
    mongoUri: getEnvOrDefault('MONGO_URI', 'mongodb://localhost:27017/crystolia'),

    // WhatsApp (UltraMsg)
    whatsapp: {
        provider: 'ultramsg',
        instanceId: getEnvOrDefault('ULTRAMSG_INSTANCE_ID', ''),
        token: getEnvOrDefault('ULTRAMSG_TOKEN', ''),
        baseUrl: getEnvOrDefault('ULTRAMSG_BASE_URL', 'https://api.ultramsg.com'),
    },

    // SMS (Twilio) — optional. Lead storage is never blocked when disabled or
    // when the provider is temporarily unavailable.
    sms: {
        provider: 'twilio',
        accountSid: getEnvOrDefault('TWILIO_ACCOUNT_SID', ''),
        authToken: getEnvOrDefault('TWILIO_AUTH_TOKEN', ''),
        fromNumber: getEnvOrDefault('TWILIO_PHONE_NUMBER', ''),
    },

    // Twilio SendGrid uses a separate API key from Twilio Messaging. Email
    // delivery is optional at boot so a provider outage never takes down auth.
    email: {
        provider: 'sendgrid',
        apiKey: getEnvOrDefault('SENDGRID_API_KEY', ''),
        fromAddress: getEnvOrDefault('EMAIL_FROM_ADDRESS', ''),
        fromName: getEnvOrDefault('EMAIL_FROM_NAME', 'Crystolia'),
        replyTo: getEnvOrDefault('EMAIL_REPLY_TO', getEnvOrDefault('EMAIL_FROM_ADDRESS', '')),
    },

    // Green Invoice
    greenInvoice: {
        apiId: getEnvOrDefault('GREEN_INVOICE_API_ID', ''),
        secret: getEnvOrDefault('GREEN_INVOICE_SECRET', ''),
        sandbox: getEnvOrDefault('GREEN_INVOICE_SANDBOX', 'true') !== 'false',
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

    // Production Security
    // The public landing sites POST the contact form cross-origin to /api/v1/leads,
    // so their origins must ALWAYS be allowed (CORS + the csrf origin check) —
    // they are merged with CORS_ALLOW_ORIGINS rather than replaced by it, so a
    // box env that only lists the admin/app origins can't silently break the
    // public lead form. Never a wildcard: the cors middleware runs with
    // credentials:true, so the exact-origin allow-list is required.
    corsOrigins: [...new Set([
        ...getEnvOrDefault('CORS_ALLOW_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim()),
        'https://business.crystolia.com',
        'https://crystolia.com',
        'https://www.crystolia.com',
        'https://crystolia.ru',
        'https://www.crystolia.ru',
        'https://crystolia.co.il',
        'https://www.crystolia.co.il',
    ])].filter(Boolean),
    cookieDomain: process.env.COOKIE_DOMAIN, // Undefined by default (host only)
    secureCookie: process.env.NODE_ENV === 'production', // True in prod, false in dev
};

export function isDevelopment(): boolean {
    return config.nodeEnv === 'development';
}

export function isProduction(): boolean {
    return config.nodeEnv === 'production';
}

export default config;
