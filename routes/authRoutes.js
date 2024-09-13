const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for user sign-up (registration)
router.post('/signup', authController.signUp);

// Route for user sign-in (login)
router.post('/login', authController.signIn);

// Route for user logout
router.post('/logout', authController.logout);

module.exports = router;
