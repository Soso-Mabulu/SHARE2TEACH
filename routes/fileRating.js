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
router.post('/', rateDocument);

// Route to get all ratings, authorized for admins
router.get('/', getAllRatings);

// Route to update a rating, authorized for users
router.put('/', updateRating);

// Route to delete a rating, authorized for users
router.delete('/', deleteRating);

module.exports = router;
