const sql = require('mssql');
const getPool = require('../config/db');
const moment = require('moment-timezone'); // Ensure moment-timezone is installed

// File moderation: approve/disapprove with comments
const moderateFile = async (req, res) => {
  const { docid, action, comments } = req.body;

  // Validate inputs
  if (!docid || !action || !['approve', 'disapprove'].includes(action)) {
    return res.status(400).json({ message: 'Invalid input: docid and action are required, action must be either approve or disapprove.' });
  }

  // Require comments if the action is 'disapprove'
  if (action === 'disapprove' && (!comments || comments.trim().length === 0)) {
    return res.status(400).json({ message: 'Comments are required when disapproving a document.' });
  }

  try {
    const pool = await getPool();
    const now = moment().tz('Africa/Johannesburg').toDate(); // Current datetime in Johannesburg timezone

    // Check if the document exists and its current status
    const documentCheckQuery = `
      SELECT status
      FROM DOCUMENT
      WHERE docid = @docid;
    `;

    const documentCheckResult = await pool.request()
      .input('docid', sql.Int, docid)
      .query(documentCheckQuery);

    // If document does not exist
    if (documentCheckResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const currentStatus = documentCheckResult.recordset[0].status;

    // Check if the document exists in the DOCUMENT_REPORTING table with a severity level of 'minor'
    const reportedDocumentCheckQuery = `
      SELECT severity_level 
      FROM DOCUMENT_REPORTING
      WHERE docId = @docid
      AND severity_level = 'minor';
    `;

    const reportedDocumentCheckResult = await pool.request()
      .input('docid', sql.Int, docid)
      .query(reportedDocumentCheckQuery);

    const isMinorSeverityReported = reportedDocumentCheckResult.recordset.length > 0;

    // If the document is approved but reported with minor severity, allow moderation
    if (currentStatus === 'approved' && isMinorSeverityReported) {
      if (action === 'approve') {
        return res.status(200).json({ message: 'Document is already approved and reported with minor severity. No changes made.' });
      } else if (action === 'disapprove') {
        // Proceed with disapproval if reported with minor severity
        await disapproveDocument(pool, docid, now, comments);
        return res.status(200).json({ message: 'Document disapproved successfully and removed from reported table.' });
      }
    }

    // Handle approved but not reported case
    if (currentStatus === 'approved' && !isMinorSeverityReported) {
      return res.status(400).json({ message: 'This document has already been approved and cannot be moderated again.' });
    }

    // Prevent approval of denied documents
    if (action === 'approve' && currentStatus === 'denied') {
      return res.status(400).json({ message: 'This document has already been denied and cannot be approved.' });
    }

    // If the document is disapproved and already denied, prevent re-disapproval
    if (action === 'disapprove' && currentStatus === 'denied') {
      return res.status(400).json({ message: 'This document has already been denied.' });
    }

    // If action is approval, and document is neither denied nor already approved
    if (action === 'approve') {
      await approveDocument(pool, docid, now);
      return res.status(200).json({ message: 'Document approved successfully.' });
    } 

    // For disapproval of documents that are not already denied
    if (action === 'disapprove') {
      await disapproveDocument(pool, docid, now, comments);
      return res.status(200).json({ message: 'Document disapproved successfully.' });
    }

  } catch (err) {
    // Enhanced error handling for primary key violation
    if (err.message.includes('Violation of PRIMARY KEY constraint') && err.message.includes('DENIED_DOCUMENT')) {
      return res.status(400).json({ message: 'Document is already denied.' });
    }

    if (err.message.includes('Violation of PRIMARY KEY constraint') && err.message.includes('APPROVED_DOCUMENT')) {
      return res.status(400).json({ message: 'Document is already approved.' });
    }

    console.error('Moderation Error:', err.message);
    res.status(500).json({ message: 'Failed to moderate document', error: err.message });
  }
};

// Function to approve a document
const approveDocument = async (pool, docid, now) => {
  const query = `
    BEGIN TRANSACTION;
    
    -- Update document status only if it is not already approved
    IF NOT EXISTS (SELECT 1 FROM APPROVED_DOCUMENT WHERE docid = @docid)
    BEGIN
      UPDATE DOCUMENT 
      SET status = 'approved'
      WHERE docid = @docid;

      -- Insert into APPROVED_DOCUMENT
      INSERT INTO APPROVED_DOCUMENT (docid, datetime_of_approval)
      VALUES (@docid, @now);

      -- Delete from PENDING_DOCUMENT
      DELETE FROM PENDING_DOCUMENT
      WHERE docid = @docid;
    END

    COMMIT TRANSACTION;
  `;
  
  await pool.request()
    .input('docid', sql.Int, docid)
    .input('now', sql.DateTime, now)
    .query(query);
};

// Function to disapprove a document
const disapproveDocument = async (pool, docid, now, comments) => {
  const query = `
    BEGIN TRANSACTION;

    -- Update document status
    UPDATE DOCUMENT 
    SET status = 'denied'
    WHERE docid = @docid;

    -- Insert into DENIED_DOCUMENT
    INSERT INTO DENIED_DOCUMENT (docid, datetime_of_denial, denial_comments)
    VALUES (@docid, @now, @comments);

    -- Delete from PENDING_DOCUMENT
    DELETE FROM PENDING_DOCUMENT
    WHERE docid = @docid;

    -- Delete from DOCUMENT_REPORTING
    DELETE FROM DOCUMENT_REPORTING
    WHERE docid = @docid;

    COMMIT TRANSACTION;
  `;

  await pool.request()
    .input('docid', sql.Int, docid)
    .input('now', sql.DateTime, now)
    .input('comments', sql.VarChar, comments)
    .query(query);
};

module.exports = {
  moderateFile,
};
