// routes/auth.js is a file that contains the routes for the authentication endpoints. It is imported in server.js and mounted at /api/v2/auth. The file contains two routes: one for signing up and one for signing in. The sign-up route inserts a new user into the database, while the sign-in route checks the user's credentials and generates a JWT token if they are valid.
const express = require('express');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwt');
const connectToDatabase = require('../config/db'); // Import MySQL config
const router = express.Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { userName, userLName, email, password } = req.body;
  let db;

  try {
    db = await connectToDatabase(); // Get the database connection

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO User (userName, userLName, email, userPassword) VALUES (?, ?, ?, ?)';
    const [results] = await db.query(query, [userName, userLName, email, hashedPassword]);

    res.status(201).json({ message: 'User created', userId: results.insertId });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (db) await db.end(); // Close the connection
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  let db;

  try {
    db = await connectToDatabase(); // Get the database connection

    const query = 'SELECT * FROM User WHERE email = ?';
    const [results] = await db.query(query, [email]);

    const user = results[0];
    if (!user || !(await bcrypt.compare(password, user.userPassword))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (db) await db.end(); // Close the connection
  }
});

module.exports = router;
