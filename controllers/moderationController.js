const sql = require('mssql');
const getPool = require('../config/db');
const moment = require('moment-timezone'); // Ensure moment-timezone is installed

// File moderation: approve/disapprove with comments
const moderateFile = async (req, res) => {
  const { docid, action, comments } = req.body; // Remove user_id

  // Validate inputs
  if (!docid || !action || !['approve', 'disapprove'].includes(action)) {
    return res.status(400).json({ message: 'Invalid input: docid and action are required. Action must be either approve or disapprove.' });
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

    // Handle approved documents
    if (currentStatus === 'approved') {
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
      await approveDocument(pool, docid, now); // Remove user_id
      return res.status(200).json({ message: 'Document approved successfully.' });
    } 

    // For disapproval of documents that are not already denied
    if (action === 'disapprove') {
      await disapproveDocument(pool, docid, now, comments);
      return res.status(200).json({ message: 'Document disapproved successfully.' });
    }

  } catch (err) {
    console.error('Moderation Error:', err.message);
    res.status(500).json({ message: 'Failed to moderate document', error: err.message });
  }
};

// Function to approve a document
const approveDocument = async (pool, docid, now) => { // Remove user_id
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
