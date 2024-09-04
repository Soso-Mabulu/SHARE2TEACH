const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const db = require('../config/db'); // Adjust the path as necessary

const router = express.Router();
// Route to request a password reset
router.post('/password-reset-request', async (req, res) => {
    const { email } = req.body;
  
    let connection;
    try {
      connection = await db();
  
      // Check if the user exists
      const query = 'SELECT * FROM [USER] WHERE email = @Email';
      const result = await connection.request()
        .input('Email', sql.VarChar, email)
        .query(query);
  
      const user = result.recordset[0];
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Generate reset token and expiration time
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
  
      // Store token and expiration in the database
      const updateQuery = `
        UPDATE [USER]
        SET resetToken = @resetToken, resetTokenExpires = @resetTokenExpires
        WHERE email = @Email
      `;
      await connection.request()
        .input('resetToken', sql.VarChar, resetToken)
        .input('resetTokenExpires', sql.DateTime, resetTokenExpires)
        .input('Email', sql.VarChar, email)
        .query(updateQuery);
  
      // Create the email transporter using environment variables
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
        text: `You requested a password reset. Click the link to reset your password: https://your-frontend-domain.com/reset-password?token=${resetToken}`
      };
  
      await transporter.sendMail(mailOptions);
  
      res.json({ message: 'Password reset link sent to your email' });
    } catch (err) {
      console.error('Request Password Reset Error:', err.message);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } finally {
      if (connection) {
        connection.close();
      }
    }
  });
// Route to reset the password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
  
    let connection;
    try {
      connection = await db();
  
      const query = `
        SELECT * FROM [USER]
        WHERE resetToken = @resetToken AND resetTokenExpires > GETDATE()
      `;
      const result = await connection.request()
        .input('resetToken', sql.VarChar, token)
        .query(query);
  
      const user = result.recordset[0];
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password and clear the reset token fields
      const updateQuery = `
        UPDATE [USER]
        SET userPassword = @userPassword, resetToken = NULL, resetTokenExpires = NULL
        WHERE userId = @userId
      `;
      await connection.request()
        .input('userPassword', sql.VarChar, hashedPassword)
        .input('userId', sql.Int, user.userId) // Update to use userId
        .query(updateQuery);
  
      res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
      console.error('Reset Password Error:', err.message);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } finally {
      if (connection) {
        connection.close();
      }
    }
  });
    

module.exports = router;
