const express = require('express');
const router = express.Router();
const { reportFile, reviewReport } = require('../controllers/fileReportController'); // Updated import
const authorize = require('../middleware/authorize');

router.use(authorize('public'));

// Report a file
router.post('/', reportFile);

// Review a report based on severity level
router.get('/:reportId/review', reviewReport); // New route to review the report

module.exports = router;
