const express = require('express');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwt');
const sql = require('mssql'); // Ensure sql is imported
const db = require('../config/db'); // Import the db.js file

const router = express.Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { userName, userLName, email, password } = req.body;

  let connection;
  try {
    connection = await db(); // Use db() to get a connection pool instance

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO [User] (userName, userLName, email, userPassword, userType)
      VALUES (@userName, @userLName, @email, @userPassword, @userType)
    `;
    
    // Set default userType value, for example 'public'
    const defaultUserType = 'public';

    await connection.request()
      .input('userName', sql.VarChar, userName)
      .input('userLName', sql.VarChar, userLName)
      .input('email', sql.VarChar, email)
      .input('userPassword', sql.VarChar, hashedPassword)
      .input('userType', sql.VarChar, defaultUserType) // Include userType in the query
      .query(query);

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Sign Up Error:', err.message); // Detailed error logging
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (connection) {
      connection.close(); // Ensure the connection is closed
    }
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  let connection;
  try {
    connection = await db(); // Use db() to get a connection pool instance

    const query = 'SELECT * FROM [User] WHERE email = @email';
    const result = await connection.request()
      .input('email', sql.VarChar, email)
      .query(query);

    const user = result.recordset[0];

    if (!user || !(await bcrypt.compare(password, user.userPassword))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Sign In Error:', err.message); // Detailed error logging
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (connection) {
      connection.close(); // Ensure the connection is closed
    }
  }
});

module.exports = router;
