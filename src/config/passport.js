const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'https://eb48-171-253-135-43.ngrok-free.app/api/auth/github/callback',
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Tìm user theo github id hoặc email
    let user = await User.findOne({ oauthProvider: 'github', oauthId: profile.id });
    if (!user && profile.emails && profile.emails.length > 0) {
      user = await User.findOne({ email: profile.emails[0].value });
    }
    if (!user) {
      // Tạo user mới
      user = new User({
        name: profile.displayName || profile.username,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : `github_${profile.id}@noemail.com`,
        oauthProvider: 'github',
        oauthId: profile.id,
        password: Math.random().toString(36).slice(-8), // random password
        role: 'user',
        status: 'active',
        isActive: true
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://eb48-171-253-135-43.ngrok-free.app/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ oauthProvider: 'google', oauthId: profile.id });
    if (!user && profile.emails && profile.emails.length > 0) {
      user = await User.findOne({ email: profile.emails[0].value });
    }
    if (!user) {
      user = new User({
        name: profile.displayName,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : `google_${profile.id}@noemail.com`,
        oauthProvider: 'google',
        oauthId: profile.id,
        password: Math.random().toString(36).slice(-8),
        role: 'user',
        status: 'active',
        isActive: true
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport; 