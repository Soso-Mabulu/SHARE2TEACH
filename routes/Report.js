const express = require('express');
const router = express.Router();
const { reportFile, reviewReport } = require('../controllers/fileReportController'); // Updated import
const authorize = require('../middleware/authorize');

// Public users can report a file
router.post('/', authorize('public'), reportFile);

// Only moderators can review a report based on severity level
router.get('/:reportId/review', authorize('moderator'), reviewReport);

module.exports = router;
