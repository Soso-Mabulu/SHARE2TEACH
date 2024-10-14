const express = require('express');
const authorize = require('../middleware/authorize');
const {
    rateDocument,
    getAllRatings,
    getAllAverageRating,
    updateRating,
    deleteRating,
} = require('../controllers/fileRatingController');

const router = express.Router();

// Route to rate a document
router.post('/', rateDocument);

// Route to get all ratings, authorized for admins
router.get('/', getAllRatings);

// Route to get all average ratings
router.get('/average/:docId', getAllAverageRating);

// Route to update a rating
router.put('/', updateRating);

// Route to delete a rating
router.delete('/', deleteRating);

module.exports = router;
