/** routes/documents.js */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authorize = require('../middleware/authorize'); 

// Route to get all documents
router.get('/',authorize(['moderator', 'admin']), documentController.getAllDocuments);

// Route to get pending documents
router.get('/pending', authorize(['moderator', 'admin']), documentController.getPendingDocuments);

// Route to get reported documents
router.get('/reported', authorize(['moderator', 'admin']), documentController.getReportedDocuments);

// Route to get denied documents
router.get('/denied', authorize(['moderator', 'admin']), documentController.getDeniedDocuments);

// Route to get approved documents
router.get('/approved', documentController.getApprovedDocuments);

// Route to search for documents
router.get('/search',authorize(['educator', 'moderator', 'admin', 'public']), documentController.searchDocuments);


// Route to get a document by ID
router.get('/:id', authorize(['moderator', 'admin']), documentController.getDocumentById);


module.exports = router;
