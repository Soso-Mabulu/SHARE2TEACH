const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const getPool = require('../config/db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { userName, userLName, email, password } = req.body;

  try {
    const pool = await getPool();
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
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
      .query(query);

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Sign Up Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

module.exports = router;
