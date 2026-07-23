// Test environment defaults — must be set before any module imports config
// (config/index.ts throws without JWT_SECRET at import time).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-production';
process.env.NODE_ENV = 'test';
// The suite fires many auth requests from one IP — relax the auth limiter
// (its production default stays 5 per 15 minutes).
process.env.AUTH_RATE_LIMIT_MAX = '10000';
// Providers stay unconfigured by default: emailService/smsService then return
// { success: false, error: 'Configuration missing' } without network calls.
delete process.env.SENDGRID_API_KEY;
delete process.env.EMAIL_PROVIDER;
delete process.env.EMAIL_FROM_ADDRESS;
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_PHONE_NUMBER;
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
process.env.ADMIN_PHONE_NUMBER = process.env.TEST_ADMIN_PHONE || '';
process.env.FRONTEND_URL = 'https://business.crystolia.com';
process.env.ADMIN_FRONTEND_URL = 'https://admin.crystolia.com';
