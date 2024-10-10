const express = require('express');
const router = express.Router(); // Initialize the router
const authorize = require('../middleware/authorize');
const {
  getAllFAQs,
  searchFAQs,
  createFAQs,
  updateFAQ,
  deleteFAQ,
  rateFAQs,
} = require('../controllers/faqController.js');

// Get all FAQs
router.get('/', authorize('admin'), getAllFAQs); 

// Search FAQs 
router.get('/search', searchFAQs);

// Create a new FAQ (admin only)
router.post('/newfaq', authorize('admin'), createFAQs);

// Update an FAQ (admin only)
router.put('/:faqId', authorize('admin'), updateFAQ);

// Delete an FAQ (admin only)
router.delete('/:faqId', authorize('admin'), deleteFAQ);

// Rate a FAQ (public, educator, moderator)
router.post('/rating/:faqId', rateFAQs);

module.exports = router;
