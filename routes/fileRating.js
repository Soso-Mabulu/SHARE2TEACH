// routes/ratingRoutes.js
const express = require('express');
const authorize = require('../middleware/authorize');
const {
    rateDocument,
    getAllRatings,
    updateRating,
    deleteRating,
} = require('../controllers/fileRatingController');

const router = express.Router();

// Route to rate a document, authorized for users
router.post('/', authorize('public'), rateDocument);

// Route to get all ratings, authorized for admins
router.get('/', authorize('admin'), getAllRatings);

// Route to update a rating, authorized for users
router.put('/', authorize('public'), updateRating);

// Route to delete a rating, authorized for users
router.delete('/', authorize('public'), deleteRating);

module.exports = router;
