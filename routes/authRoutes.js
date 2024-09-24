const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const generateToken = require('../utils/jwt');

// Route for user sign-up (registration)
router.post('/signup', authController.signUp);

// Route for user sign-in (login)
router.post('/login', authController.signIn);

// Route for user logout
router.post('/logout', authController.logout);

// Route for requesting a password reset
router.post('/password-reset-request', authController.requestPasswordReset);

// Route for resetting the password
router.post('/reset-password', authController.resetPassword);

// Google authentication route
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google callback route
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Generate token after successful authentication
    const token = generateToken(req.user); // Assuming req.user contains user info
    console.log("token", token);
    
    // Return the token as JSON response
    res.json({
      message: 'Login Successful!',
      token: token,
    });
  }
);

module.exports = router;