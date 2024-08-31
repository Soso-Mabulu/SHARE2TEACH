const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');
const { getPendingDocuments, moderateDocument } = require('../controllers/moderationController');

// Apply the authorization middleware
router.use(authorize('moderator'));

router.get('/pending', getPendingDocuments);
router.post('/:docId', moderateDocument);

module.exports = router;
