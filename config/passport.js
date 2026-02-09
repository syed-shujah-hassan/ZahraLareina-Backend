import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} = process.env;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email provided by Google'));
          }

          let user = await User.findOne({ email });

          if (!user) {
            user = await User.create({
              fullName: profile.displayName || 'Google User',
              email,
              googleId: profile.id,
              provider: 'google',
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = 'google';
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, undefined);
        }
      }
    )
  );
}

export default passport;
