/** routes/documents.js */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authorize = require('../middleware/authorize'); 

// Route to get all documents
router.get('/',authorize(['educator', 'moderator', 'admin']), documentController.getAllDocuments);

// Route to get pending documents
router.get('/pending', authorize(['educator', 'moderator', 'admin']), documentController.getPendingDocuments);

// Route to get reported documents
router.get('/reported', authorize(['educator', 'moderator', 'admin']), documentController.getReportedDocuments);

// Route to get denied documents
router.get('/denied', authorize(['educator', 'moderator', 'admin']), documentController.getDeniedDocuments);

// Route to get approved documents
router.get('/approved', authorize(['educator', 'moderator', 'admin']), documentController.getApprovedDocuments);

// Route to search for documents
router.get('/search',authorize(['educator', 'moderator', 'admin', 'public']), documentController.searchDocuments);


// Route to get a document by ID
router.get('/:id', documentController.getDocumentById);


module.exports = router;
