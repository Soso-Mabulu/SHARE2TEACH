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
            // User doesn't exist, create a new one
            const insertQuery = `
                INSERT INTO [USER] (userName, userLName, email, userPassword, userType)
                OUTPUT INSERTED.userId, INSERTED.userName, INSERTED.userLName, INSERTED.email
                VALUES (@userName, @userLName, @Email, @userPassword, @userType)
            `;

            const dummyPassword = 'dummyPassword'; // Dummy password for Google login
            const hashedPassword = await bcrypt.hash(dummyPassword, 10);
            const insertResult = await pool.request()
                .input('userName', sql.VarChar, userName)
                .input('userLName', sql.VarChar, userLName)
                .input('Email', sql.VarChar, email)
                .input('userPassword', sql.VarChar, hashedPassword)
                .input('userType', sql.VarChar, 'public')
                .query(insertQuery);

            return done(null, insertResult.recordset[0]); // Ensure this contains 'userId'
        }
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    console.log("Serializing user:", user);
    done(null, user.userId); // Use 'userId' to serialize
});

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
