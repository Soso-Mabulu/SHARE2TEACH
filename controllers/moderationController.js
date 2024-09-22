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

    // Check if the document has already been moderated
    if (currentStatus === 'approved' || currentStatus === 'denied') {
      return res.status(400).json({ message: `Document has already been ${currentStatus}.` });
    }

    let query;
    const inputs = {
      docid: sql.Int,
      now: sql.DateTime
    };

    if (action === 'approve') {
      query = `
        BEGIN TRANSACTION;
        
        -- Update document status
        UPDATE DOCUMENT 
        SET status = 'approved'
        WHERE docid = @docid;

        -- Insert into APPROVED_DOCUMENT
        INSERT INTO APPROVED_DOCUMENT (docid, datetime_of_approval)
        VALUES (@docid, @now);

        COMMIT TRANSACTION;
      `;
    } else {
      query = `
        BEGIN TRANSACTION;

        -- Update document status
        UPDATE DOCUMENT 
        SET status = 'denied'
        WHERE docid = @docid;

        -- Insert into DENIED_DOCUMENT
        INSERT INTO DENIED_DOCUMENT (docid, datetime_of_denial, denial_comments)
        VALUES (@docid, @now, @comments);

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
    console.error('Moderation Error:', err.message);
    res.status(500).json({ message: 'Failed to moderate document', error: err.message });
  }
};

module.exports = {
  moderateFile,
};
