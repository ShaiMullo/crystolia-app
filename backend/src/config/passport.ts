// ===============================================
// 🛂 Passport Configuration
// ===============================================

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { config } from './index.js';
import { sendRegistrationPendingEmail } from '../services/emailService.js';

// Configure Google Strategy
if (config.google.clientId && config.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.google.clientId,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackUrl,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // 1. Check if user exists
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    let user = await User.findOne({ email });

                    if (user) {
                        // User exists -> Return user
                        return done(null, user);
                    }

                    // 2. Create new user if not exists
                    // FORCE role 'customer'
                    // Company will be null initially -> triggers onboarding flow
                    user = await User.create({
                        name: profile.displayName,
                        email: email,
                        password: 'GOOGLE_OAUTH_USER', // Placeholder, they won't use password login
                        role: 'customer',
                        isActive: false,
                        registrationStatus: 'pending',
                        preferredLocale: 'en',
                        googleId: profile.id,
                        avatar: profile.photos?.[0]?.value,
                        isGoogleUser: true, // Keep this flag
                    });

                    const emailResult = await sendRegistrationPendingEmail({
                        to: user.email,
                        name: user.name,
                        locale: 'en',
                    });
                    if (!emailResult.success) {
                        console.warn('[Registration] Google pending email was not delivered:', emailResult.error);
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
} else {
    console.warn('⚠️ Google OAuth credentials not found. Google Auth will not work.');
}

export default passport;
