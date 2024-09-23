const express = require('express');
const router = express.Router();
const { reportFile, reviewReport } = require('../controllers/fileReportController');

// Report a file
router.post('/', reportFile);

// Review a report (for moderate and egregious cases)
router.post('/:reportId/review', reviewReport); // This handles the review based on the severity level

module.exports = router;
