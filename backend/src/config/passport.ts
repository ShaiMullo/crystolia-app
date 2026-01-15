import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import { Strategy as AppleStrategy } from 'passport-apple'; // Commented out until we have actual keys/lib support is verified
import { UserModel } from '../models/User.js';

// Serialize user for the session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
    callbackURL: "/api/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    console.log("🔹 Google Strategy Callback Triggered");
    console.log("Profile ID:", profile.id);
    try {
        // 1. Check if user exists by googleId
        let user = await UserModel.findOne({ googleId: profile.id });

        if (user) {
            // Update profile picture if not set
            if (!user.profilePicture && profile.photos?.[0]?.value) {
                user.profilePicture = profile.photos[0].value;
                await user.save();
            }
            return done(null, user);
        }

        // 2. Check if user exists by email
        const email = profile.emails?.[0].value;
        if (email) {
            user = await UserModel.findOne({ email });
            if (user) {
                console.log("🔹 User found by email, linking Google ID");
                // Link Google account and update profile picture
                user.googleId = profile.id;
                if (!user.profilePicture && profile.photos?.[0]?.value) {
                    user.profilePicture = profile.photos[0].value;
                }
                await user.save();
                return done(null, user);
            }
        }

        // 3. Create new user
        const newUser = new UserModel({
            googleId: profile.id,
            email: email,
            firstName: (profile.name?.givenName || 'Google').trim(),
            lastName: (profile.name?.familyName || 'User').trim(),
            profilePicture: profile.photos?.[0]?.value || null,
            role: 'customer' // Default role
        });

        console.log("🔹 Creating new user from Google profile");
        await newUser.save();
        done(null, newUser);

    } catch (error) {
        console.error("❌ Google Strategy Error:", error);
        done(error, undefined);
    }
}));

// Apple Strategy (Placeholder Implementation)
// Real implementation requires detailed Key file reading
/*
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_SERVICE_ID || "",
    teamID: process.env.APPLE_TEAM_ID || "",
    keyID: process.env.APPLE_KEY_ID || "",
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH || "", // or privateKeyString
    callbackURL: "/api/auth/apple/callback",
    passReqToCallback: true
}, async (req, accessToken, refreshToken, idToken, profile, done) => {
    // Logic similar to Google
    // Note: Apple only sends 'profile' (name/email) on the FIRST login.
    // We need to handle that carefully.
    try {
        // ... find or create logic
        done(null, {});
    } catch (err) {
        done(err, undefined);
    }
}));
*/

export default passport;
