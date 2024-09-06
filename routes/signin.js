const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const getPool = require('../config/db');
const generateToken = require('../utils/jwt');
const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await getPool();  // Get the shared pool
    const query = 'SELECT * FROM [User] WHERE email = @email';
    const result = await pool.request()
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
  }
});

module.exports = router;
