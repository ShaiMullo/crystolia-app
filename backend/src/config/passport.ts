// ===============================================
// 🛂 Passport Configuration
// ===============================================
// The Google strategy only performs the OAuth code exchange and hands the
// verified profile to the route layer. All account decisions (login, linking
// policy, registration ticket) live in routes/auth.ts — the strategy itself
// must never create users or send emails, so an OAuth round-trip can never
// leave a partial pending user behind.

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index.js';

if (config.google.clientId && config.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.google.clientId,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackUrl,
            },
            (accessToken, refreshToken, profile, done) => {
                done(null, { profile });
            }
        )
    );
} else {
    console.warn('⚠️ Google OAuth credentials not found. Google Auth will not work.');
}

export default passport;
