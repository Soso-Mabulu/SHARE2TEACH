const { OAuth2Client } = require('google-auth-library');
const sql = require('mssql');
const getPool = require('../config/db'); // Adjust this path as needed
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(user) {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function handleGoogleLogin(req, res) {
  try {
    const { token } = req.body;
    const payload = await verifyGoogleToken(token);
    
    const { email, given_name, family_name } = payload;
    const pool = await getPool();

    // Check if the user already exists
    const checkUserQuery = 'SELECT * FROM [USER] WHERE email = @Email';
    const checkUserResult = await pool.request()
      .input('Email', sql.VarChar, email)
      .query(checkUserQuery);

    let user;
    if (checkUserResult.recordset.length > 0) {
      // User exists
      user = checkUserResult.recordset[0];
    } else {
      // Create new user
      const dummyPassword = 'GoogleOAuthDummyPassword';
      const hashedPassword = await bcrypt.hash(dummyPassword, 10);

      const insertQuery = `
        INSERT INTO [USER] (userName, userLName, email, userPassword, userType)
        OUTPUT INSERTED.userId, INSERTED.userName, INSERTED.userLName, INSERTED.email, INSERTED.userType
        VALUES (@userName, @userLName, @Email, @userPassword, @userType)
      `;

      const insertResult = await pool.request()
        .input('userName', sql.VarChar, given_name)
        .input('userLName', sql.VarChar, family_name)
        .input('Email', sql.VarChar, email)
        .input('userPassword', sql.VarChar, hashedPassword)
        .input('userType', sql.VarChar, 'public')
        .query(insertQuery);

      user = insertResult.recordset[0];
    }

    // Generate JWT token
    const jwtToken = generateToken(user);

    // Determine redirect URL based on user role
    const baseUrl = 'https://share2teach-frontend-dev-494405022119.us-central1.run.app';
    let redirectUrl;
    switch (user.userType) {
      case 'admin':
        redirectUrl = `${baseUrl}/admin-dashboard`;
        break;
      case 'educator':
        redirectUrl = `${baseUrl}/educator-dashboard`;
        break;
      case 'moderator':
        redirectUrl = `${baseUrl}/moderator-dashboard`;
        break;
      default:
        redirectUrl = `${baseUrl}/public-user-dashboard`;
    }

    res.json({ token: jwtToken, redirectUrl });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { handleGoogleLogin };