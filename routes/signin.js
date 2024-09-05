// routes/signin.js
const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const db = require('../config/db');
const generateToken = require('../utils/jwt');
const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  let connection;
  try {
    connection = await db();
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
    console.error('Sign In Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;
