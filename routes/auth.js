const express = require('express');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwt');
const db = require('../config/db');
const router = express.Router();
const passport = require('passport');

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { userName, userLName, email, password } = req.body;
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

// Route to initiate Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

// Google OAuth callback route
router.get('/google/callback',
  passport.authenticate('google', { session: false }), async (req, res) => {
      if (!req.user) {
          return res.redirect('/auth/failure');
      }

      const { email, displayName } = req.user;
      const [firstName, lastName] = displayName ? displayName.split(' ') : ['Unknown', 'User'];

      // Check if the user already exists in the database
      db.query('SELECT * FROM User WHERE email = ?', [email], (err, results) => {
          if (err) return res.status(500).json({ error: err.message });

          if (results.length === 0) {
              // If user doesn't exist, create a new user
              db.query('INSERT INTO User (userName, userLName, email) VALUES (?, ?, ?)', [firstName, lastName, email], (err, results) => {
                  if (err) return res.status(500).json({ error: err.message });
                  
                  const token = generateToken(user);
                  
                  return res.json({ token });
              });
          } else {
              const token = generateToken(user);
              // If user exists, proceed to success
              return res.json({ token });
          }
      });
  });


// Success route
router.get('/success', (req, res) => {
    if (!req.user) {
        return res.redirect('/auth/failure');
    }
    res.send(`Welcome ${req.user.emails[0].value}`);
});

// Failure route
router.get('/failure', (req, res) => {
    res.send("Error during authentication");
});

module.exports = router;
