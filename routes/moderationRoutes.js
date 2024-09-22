const express = require('express');
const { moderateFile } = require('../controllers/moderationController');
const authorize = require('../middleware/authorize');

const router = express.Router();

// POST route for moderators to approve/disapprove documents with comments
router.post('/', authorize(['moderator', 'admin']), moderateFile);

module.exports = router;
