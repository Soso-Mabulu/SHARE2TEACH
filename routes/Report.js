const express = require('express');
const router = express.Router();
const { reportFile, denyReport } = require('../controllers/fileReportController');
const authorize = require('../middleware/authorize');


router.use(authorize(['public','educator', 'moderator', 'admin']));

// Report a file
router.post('/', reportFile);

// Deny a report
//router.post('/:id/deny', denyReport);

module.exports = router;
