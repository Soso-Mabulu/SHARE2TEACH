const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');
const analyticsController = require('../controllers/analyticsController');

router.use(authorize('admin'));
// Document status counts
router.get('/approved-documents', analyticsController.getApprovedDocuments);
router.get('/denied-documents', analyticsController.getDeniedDocuments);
router.get('/reported-documents', analyticsController.getReportedDocuments);
router.get('/pending-documents', analyticsController.getPendingDocuments);

// User activity and metrics
router.get('/total-users', analyticsController.getTotalUsers);
router.get('/active-users', analyticsController.getActiveUsers);
router.get('/user-signups', analyticsController.getUserSignups);

// Rating metrics
router.get('/ratings-per-time-period', analyticsController.getRatingsPerTimePeriod);
router.get('/uploaded-documents', analyticsController.getUploadedDocuments);

// Approval metrics
router.get('/approved-documents-per-period', analyticsController.getApprovedDocsPerPeriod);
router.get('/denied-documents-per-period', analyticsController.getDeniedDocsPerPeriod);
router.get('/reported-documents-per-period', analyticsController.getReportedDocsPerPeriod);

module.exports = router;
