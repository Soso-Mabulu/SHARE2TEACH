/** routes/documents.js */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authorize = require('../middleware/authorize'); 

// Route to get all documents
router.get('/',authorize(['educator', 'moderator', 'admin', 'public']), documentController.getAllDocuments);

// Route to get pending documents
router.get('/pending', documentController.getPendingDocuments);

// Route to get reported documents
router.get('/reported', documentController.getReportedDocuments);

// Route to get denied documents
router.get('/denied', documentController.getDeniedDocuments);

// Route to get approved documents
router.get('/approved', documentController.getApprovedDocuments);

// Route to search for documents
router.get('/search', documentController.searchDocuments);


// Route to get a document by ID
router.get('/:id', documentController.getDocumentById);


module.exports = router;
