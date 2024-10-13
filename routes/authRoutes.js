const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { handleGoogleLogin } = require('../utils/googleAuth'); // Adjust path as needed

// Existing routes
router.post('/signup', authController.signUp);
router.post('/login', authController.signIn);
router.post('/logout', authController.logout);
router.post('/password-reset-request', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// New Google authentication route
router.post('/google', handleGoogleLogin);

module.exports = router;