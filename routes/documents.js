/** routes/documents.js */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Route to get all documents
router.get('/', documentController.getAllDocuments);

// Route to get pending documents
router.get('/pending', documentController.getPendingDocuments);

// Route to get reported documents
router.get('/reported', documentController.getReportedDocuments);

// Route to get denied documents
router.get('/denied', documentController.getDeniedDocuments);

// Route to get approved documents
router.get('/approved', documentController.getApprovedDocuments);

// Route to get a document by ID
router.get('/:id', documentController.getDocumentById);

module.exports = router;

/** 
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management operations
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: A list of all documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: '607c191e810c19729de860ea'
 *                   title:
 *                     type: string
 *                     example: 'Sample Document'
 *                   status:
 *                     type: string
 *                     example: 'pending'
 *                   content:
 *                     type: string
 *                     example: 'This is the content of the document.'
 */

/**
 * @swagger
 * /documents/pending:
 *   get:
 *     summary: Get pending documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: A list of pending documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: '607c191e810c19729de860eb'
 *                   title:
 *                     type: string
 *                     example: 'Pending Document'
 *                   status:
 *                     type: string
 *                     example: 'pending'
 *                   content:
 *                     type: string
 *                     example: 'This is the content of the pending document.'
 */

/**
 * @swagger
 * /documents/reported:
 *   get:
 *     summary: Get reported documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: A list of reported documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: '607c191e810c19729de860ec'
 *                   title:
 *                     type: string
 *                     example: 'Reported Document'
 *                   status:
 *                     type: string
 *                     example: 'reported'
 *                   content:
 *                     type: string
 *                     example: 'This is the content of the reported document.'
 */

/**
 * @swagger
 * /documents/denied:
 *   get:
 *     summary: Get denied documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: A list of denied documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: '607c191e810c19729de860ed'
 *                   title:
 *                     type: string
 *                     example: 'Denied Document'
 *                   status:
 *                     type: string
 *                     example: 'denied'
 *                   content:
 *                     type: string
 *                     example: 'This is the content of the denied document.'
 */

/**
 * @swagger
 * /documents/approved:
 *   get:
 *     summary: Get approved documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: A list of approved documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: '607c191e810c19729de860ee'
 *                   title:
 *                     type: string
 *                     example: 'Approved Document'
 *                   status:
 *                     type: string
 *                     example: 'approved'
 *                   content:
 *                     type: string
 *                     example: 'This is the content of the approved document.'
 */

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get a document by ID
 *     tags: [Documents]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: '607c191e810c19729de860ef'
 *     responses:
 *       200:
 *         description: A document object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: '607c191e810c19729de860ef'
 *                 title:
 *                   type: string
 *                   example: 'Specific Document'
 *                 status:
 *                   type: string
 *                   example: 'pending'
 *                 content:
 *                   type: string
 *                   example: 'This is the content of the specific document.'
 *       404:
 *         description: Document not found
 */