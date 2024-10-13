const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const generateToken = require('../utils/jwt');

// Route for user sign-up (registration)
router.post('/signup', authController.signUp);

// Route for user sign-in (login)
router.post('/login', authController.signIn);

// Route for user logout
router.post('/logout', authController.logout);

// Route for requesting a password reset
router.post('/password-reset-request', authController.requestPasswordReset);

// Route for resetting the password
router.post('/reset-password', authController.resetPassword);

// Google authentication route
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    try {
      // Generate token after successful authentication
      const token = generateToken(req.user); // Assuming req.user contains user info

      // Get user role
      const userRole = req.user.role; // Adjust this based on how you store user roles

      // Redirect based on user role
      const baseUrl = 'https://share2teach-frontend-dev-494405022119.us-central1.run.app';
      switch (userRole) {
        case 'admin':
          return res.redirect(`${baseUrl}/admin-dashboard?token=${token}`);
        case 'educator':
          return res.redirect(`${baseUrl}/educator-dashboard?token=${token}`);
        case 'moderator':
          return res.redirect(`${baseUrl}/moderator-dashboard?token=${token}`);
        default: // Handle public users and any other roles
          return res.redirect(`${baseUrl}/public-user-dashboard?token=${token}`);
      }
    } catch (error) {
      console.error('Error during Google callback:', error);
      return res.status(500).redirect('/'); // Redirect to homepage on error
    }
  }
);

module.exports = router;

// Google OAuth Strategy with Passport
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sql = require('mssql');
const getPool = require('./db');
const bcrypt = require('bcrypt');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://share2teach-backend-dev-cs4b5lzjkq-uc.a.run.app/api/v1/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const userName = profile.name.givenName || 'Unknown';
    const userLName = profile.name.familyName || ''; 

    try {
        const pool = await getPool();
    
        // Check if the user already exists
        const checkUserQuery = 'SELECT * FROM [USER] WHERE email = @Email';
        const checkUserResult = await pool.request()
            .input('Email', sql.VarChar, email)
            .query(checkUserQuery);

        if (checkUserResult.recordset.length > 0) {
            // User exists, proceed
            return done(null, checkUserResult.recordset[0]); // Ensure this contains 'userId'
        } else {
            // User doesn't exist, create a new one with a hashed dummy password
            const insertQuery = `
                INSERT INTO [USER] (userName, userLName, email, userPassword, userType)
                OUTPUT INSERTED.userId, INSERTED.userName, INSERTED.userLName, INSERTED.email
                VALUES (@userName, @userLName, @Email, @userPassword, @userType)
            `;

            // Generate a hashed dummy password for the Google login
            const dummyPassword = 'GoogleOAuthDummyPassword'; // Dummy password
            const hashedPassword = await bcrypt.hash(dummyPassword, 10); // Hash the dummy password

            const insertResult = await pool.request()
                .input('userName', sql.VarChar, userName)
                .input('userLName', sql.VarChar, userLName)
                .input('Email', sql.VarChar, email)
                .input('userPassword', sql.VarChar, hashedPassword) // Insert the hashed dummy password
                .input('userType', sql.VarChar, 'public')
                .query(insertQuery);

            return done(null, insertResult.recordset[0]); // Ensure this contains 'userId'
        }
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        return done(err);
    }
}));

// Serialize user to maintain sessions
passport.serializeUser((user, done) => {
    done(null, user.userId); // Use 'userId' to serialize
});

// Deserialize user for session tracking
passport.deserializeUser(async (userId, done) => {
    try {
        const pool = await getPool();
        const query = 'SELECT * FROM [USER] WHERE userId = @userId'; // Use 'userId' for deserialization
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        if (result.recordset.length > 0) {
            done(null, result.recordset[0]);
        } else {
            done(new Error('User not found'));
        }
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
