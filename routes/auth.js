// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwt');
const db = require('../config/db'); // Import your MySQL config
const router = express.Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { userName, userLName, email, password} = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO User (userName, userLName, email, userPassword) VALUES (?, ?, ?, ?)';
    db.query(query, [userName, userLName, email, hashedPassword], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'User created', userId: results.insertId });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM User WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const user = results[0];
      if (!user || !(await bcrypt.compare(password, user.userPassword))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = generateToken(user);
      res.json({ token });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
