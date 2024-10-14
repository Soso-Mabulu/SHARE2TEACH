const express = require('express');
const router = express.Router();
const { reportFile, handleRestrictedDocument } = require('../controllers/fileReportController');
const authorize = require('../middleware/authorize');

// Report a file
router.post('/', authorize(['public']), reportFile);

// Handle restricted document
router.post('/restricted-document', authorize(['admin', 'moderator']), handleRestrictedDocument);

module.exports = router;

