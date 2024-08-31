const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');
const { getPendingDocuments } = require('../controllers/moderationController');

// Apply the authorization middleware
router.use(authorize('moderator'));

router.get('/pending', getPendingDocuments);

module.exports = router;
