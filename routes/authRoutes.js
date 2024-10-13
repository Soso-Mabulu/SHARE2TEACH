const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport'); // Already configured in separate file
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
    try {
      // Generate token after successful authentication
      const token = generateToken(req.user);

      // Get user role
      const userRole = req.user.role;

      // Redirect based on user role
      const baseUrl = 'https://share2teach-frontend-dev-494405022119.us-central1.run.app';
      switch (userRole) {
        case 'admin':
          return res.redirect(`${baseUrl}/admin-dashboard?token=${token}`);
        case 'educator':
          return res.redirect(`${baseUrl}/educator-dashboard?token=${token}`);
        case 'moderator':
          return res.redirect(`${baseUrl}/moderator-dashboard?token=${token}`);
        default:
          return res.redirect(`${baseUrl}/public-user-dashboard?token=${token}`);
      }
    } catch (error) {
      console.error('Error during Google callback:', error.message);
      return res.status(500).redirect('/');
    }
  }
);

module.exports = router;


