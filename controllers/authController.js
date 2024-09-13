const bcrypt = require('bcrypt');
const sql = require('mssql');
const getPool = require('../config/db');
const generateToken = require('../utils/jwt');

// User Sign-Up
const signUp = async (req, res) => {
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

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Sign In Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};


const logout = (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
  signUp,
  signIn,
  logout
};
