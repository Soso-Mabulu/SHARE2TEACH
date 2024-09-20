// routes/protected.js
const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');

router.get('/admin', (req, res) => {
  res.send('Welcome, admin!');
});

router.get('/moderator', authorize('moderator'), (req, res) => {
  res.send('Welcome, moderator!');
});

router.get('/educator', authorize('educator'), (req, res) => {
  res.send('Welcome, educator!');
});

router.get('/user', authorize(['admin', 'moderator', 'educator', 'public access user']), (req, res) => {
  res.send('Welcome, user!');
});

module.exports = router;
