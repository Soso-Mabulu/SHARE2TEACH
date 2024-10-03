const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sql = require('mssql');
const getPool = require('../config/db');
const generateToken = require('../utils/jwt');
const { addToken, isBlacklisted } = require('../utils/tokenBlacklist');

// User Sign-Up
const signUp = async (req, res) => {
  const { userName, userLName, email, password } = req.body;

  try {
    const pool = await getPool();

    // Check if the user already exists
    const checkUserQuery = 'SELECT * FROM [User] WHERE email = @email';
    const checkUserResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(checkUserQuery);

    if (checkUserResult.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO [User] (userName, userLName, email, userPassword, userType)
      VALUES (@userName, @userLName, @email, @userPassword, @userType)
    `;
    const defaultUserType = 'public';

    await pool.request()
      .input('userName', sql.VarChar, userName)
      .input('userLName', sql.VarChar, userLName)
      .input('email', sql.VarChar, email)
      .input('userPassword', sql.VarChar, hashedPassword)
      .input('userType', sql.VarChar, defaultUserType)
      .query(insertQuery);

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Sign Up Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// User Sign-In
const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await getPool();
    const query = 'SELECT * FROM [User] WHERE email = @email';
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(query);

    const user = result.recordset[0];
    if (!user || !(await bcrypt.compare(password, user.userPassword))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login timestamp
    const updateLastLoginQuery = `
      UPDATE [User]
      SET last_login = GETDATE()
      WHERE email = @email
    `;
    await pool.request()
      .input('email', sql.VarChar, email)
      .query(updateLastLoginQuery);

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Sign In Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// Logout
const logout = (req, res) => {
  const token = req.body.token || req.headers.authorization?.split(' ')[1]; // Support token from body or header
  if (token) {
    addToken(token); // Add the token to the blacklist
    res.status(200).json({ message: 'Logout successful' });
  } else {
    res.status(400).json({ message: 'No token provided' });
  }
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const pool = await getPool();
    const query = 'SELECT * FROM [USER] WHERE email = @Email';
    const result = await pool.request()
      .input('Email', sql.VarChar, email)
      .query(query);

    const user = result.recordset[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    const updateQuery = `
      UPDATE [USER]
      SET resetToken = @resetToken, resetTokenExpires = @resetTokenExpires
      WHERE email = @Email
    `;
    await pool.request()
      .input('resetToken', sql.VarChar, resetToken)
      .input('resetTokenExpires', sql.DateTime, resetTokenExpires)
      .input('Email', sql.VarChar, email)
      .query(updateQuery);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333;">
          <div style="max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h1 style="text-align: center; color: #5b4b9a;">Share2Teach Password Reset</h1>
            <p>Dear User,</p>
            <p>You have requested to reset your password for your Share2Teach account. To proceed, please click the button below:</p>
            
            <a href="https://your-frontend-domain.com/reset-password?token=${resetToken}" 
               style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #5b4b9a; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Reset Password
            </a>
            
            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For any questions or concerns, feel free to contact our support team at <a href="mailto:support@share2teach.com" style="color: #5b4b9a;">support@share2teach.com</a>.</p>
            
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ccc;" />
            <p style="font-size: 12px; text-align: center; color: #777;">
              &copy; ${new Date().getFullYear()} Share2Teach. All rights reserved.<br />
              Share2Teach, Inc. | 123 Education Lane | Learning City, ST 12345<br />
              <a href="https://www.share2teach.com/privacy-policy" style="color: #5b4b9a;">Privacy Policy</a> | <a href="https://www.share2teach.com/terms-of-service" style="color: #5b4b9a;">Terms of Service</a>
            </p>
          </div>
        </div>
      `
    };
    

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('Request Password Reset Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const pool = await getPool();
    const query = `
      SELECT * FROM [USER]
      WHERE resetToken = @resetToken AND resetTokenExpires > GETDATE()
    `;
    const result = await pool.request()
      .input('resetToken', sql.VarChar, token)
      .query(query);

    const user = result.recordset[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateQuery = `
      UPDATE [USER]
      SET userPassword = @userPassword, resetToken = NULL, resetTokenExpires = NULL
      WHERE userId = @userId
    `;
    await pool.request()
      .input('userPassword', sql.VarChar, hashedPassword)
      .input('userId', sql.Int, user.userId)
      .query(updateQuery);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset Password Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};

module.exports = {
  signUp,
  signIn,
  logout,
  requestPasswordReset,
  resetPassword,
};
