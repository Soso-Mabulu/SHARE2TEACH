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

    if (documentCheckResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const currentStatus = documentCheckResult.recordset[0].status;

    // Prevent re-approval of denied documents
    if (action === 'approve' && currentStatus === 'denied') {
      return res.status(400).json({ message: 'This document has already been denied and cannot be approved.' });
    }

    // Prevent re-disapproval of approved documents
    if (action === 'disapprove' && currentStatus === 'approved') {
      return res.status(400).json({ message: 'This document has already been approved and cannot be disapproved.' });
    }

    // Check if the document exists in the DOCUMENT_REPORTING table with a severity level
    const reportedDocumentCheckQuery = `
      SELECT severity_level
      FROM DOCUMENT_REPORTING
      WHERE docId = @docid;
    `;

    const reportedDocumentCheckResult = await pool.request()
      .input('docid', sql.Int, docid)
      .query(reportedDocumentCheckQuery);

    const isReported = reportedDocumentCheckResult.recordset.length > 0;

    // If the document is already approved and has been reported, skip the approval process
    if (currentStatus === 'approved' && isReported && action === 'approve') {
      return res.status(200).json({ message: 'Document is already approved and reported. No further actions taken.' });
    }

    let query;
    const inputs = {
      docid: sql.Int,
      now: sql.DateTime
    };

    if (action === 'approve') {
      query = `
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
    } else {
      // For disapproval: Insert into DENIED_DOCUMENT, delete from PENDING_DOCUMENT, and remove from DOCUMENT_REPORTING
      query = `
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
      inputs.comments = sql.VarChar;
    }

    // Execute query
    const request = pool.request()
      .input('docid', inputs.docid, docid)
      .input('now', inputs.now, now);
    
    if (action === 'disapprove') {
      request.input('comments', inputs.comments, comments);
    }

    await request.query(query);

    res.status(200).json({ message: `Document ${action}d successfully.` });
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

module.exports = {
  moderateFile,
};
