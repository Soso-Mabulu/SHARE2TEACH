const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');

// Function to handle reporting a file and checking its severity
const reportFile = async (req, res) => {
    const { docId, userId, reporting_details } = req.body;

    try {
        const connection = await connectToDatabase();
        const transaction = new sql.Transaction(connection);

        try {
            await transaction.begin();

            // Check if the document is in the DOCUMENT table with status 'approved'
            const checkDocumentQuery = `
                SELECT COUNT(*) AS count FROM DOCUMENT WHERE docId = @docId AND status = 'approved'
            `;
            const checkRequest = new sql.Request(transaction);
            checkRequest.input('docId', sql.Int, docId);
            const documentResult = await checkRequest.query(checkDocumentQuery);

            if (documentResult.recordset[0].count === 0) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Document not found or not approved.' });
            }

            // Check if the user has already reported this document
            const checkReportQuery = `
                SELECT COUNT(*) AS count FROM DOCUMENT_REPORTING WHERE docId = @docId AND userId = @userId
            `;
            const reportCheckRequest = new sql.Request(transaction);
            reportCheckRequest.input('docId', sql.Int, docId);
            reportCheckRequest.input('userId', sql.Int, userId);
            const reportResult = await reportCheckRequest.query(checkReportQuery);

            if (reportResult.recordset[0].count > 0) {
                await transaction.rollback();
                return res.status(400).json({ message: 'You have already reported this document.' });
            }

            // Insert the report into the DOCUMENT_REPORTING table
            const insertReportQuery = `
                INSERT INTO DOCUMENT_REPORTING (docId, userId, reporting_details, reporting_timestamp)
                VALUES (@docId, @userId, @reporting_details, @reporting_timestamp)
            `;
            const request = new sql.Request(transaction);
            request.input('docId', sql.Int, docId);
            request.input('userId', sql.Int, userId);
            request.input('reporting_details', sql.NVarChar, reporting_details);
            request.input('reporting_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
            await request.query(insertReportQuery);

            // Count the number of reports for the document
            const countReportsQuery = `
                SELECT COUNT(*) AS count FROM DOCUMENT_REPORTING WHERE docId = @docId
            `;
            const countRequest = new sql.Request(transaction);
            countRequest.input('docId', sql.Int, docId);
            const reportCountResult = await countRequest.query(countReportsQuery);
            const reportCount = reportCountResult.recordset[0].count;

            // If the document has been reported 5 or more times, move it to the restricted view table
            if (reportCount >= 5) {
                const restrictDocumentQuery = `
                    INSERT INTO RESTRICTED_VIEW (docId, restricted_timestamp)
                    SELECT docId, @restricted_timestamp
                    FROM DOCUMENT_REPORTING
                    WHERE docId = @docId;
                    
                    UPDATE DOCUMENT SET status = 'restricted' WHERE docId = @docId;
                `;
                const restrictRequest = new sql.Request(transaction);
                restrictRequest.input('docId', sql.Int, docId);
                restrictRequest.input('restricted_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
                await restrictRequest.query(restrictDocumentQuery);
            }

            // Commit the transaction
            await transaction.commit();
            res.status(200).json({ message: 'File reported successfully.' });

        } catch (err) {
            await transaction.rollback();
            console.error('Error during transaction:', err);
            res.status(500).json({ message: 'Failed to report file.', error: err.message });
        }

    } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    }
};

// Function to handle moderator actions on restricted documents
const handleRestrictedDocument = async (req, res) => {
    const { docId, action, denialComments } = req.body;

    try {
        const connection = await connectToDatabase();
        const transaction = new sql.Transaction(connection);

        try {
            await transaction.begin();

            if (action === 'approve') {
                // Move document to approved
                const approveDocumentQuery = `
                    UPDATE DOCUMENT SET status = 'approved' WHERE docId = @docId;
                    INSERT INTO APPROVED_DOCUMENT (docId, datetime_of_approval) VALUES (@docId, GETDATE());
                    DELETE FROM RESTRICTED_VIEW WHERE docId = @docId;
                `;
                const approveRequest = new sql.Request(transaction);
                approveRequest.input('docId', sql.Int, docId);
                await approveRequest.query(approveDocumentQuery);

            } else if (action === 'deny') {
                // Mark document as denied
                const denyDocumentQuery = `
                    UPDATE DOCUMENT SET status = 'denied' WHERE docId = @docId;
                    INSERT INTO DENIED_DOCUMENT (docId, datetime_of_denial, denial_comments) VALUES (@docId, GETDATE(), @denialComments);
                    DELETE FROM RESTRICTED_VIEW WHERE docId = @docId;
                `;
                const denyRequest = new sql.Request(transaction);
                denyRequest.input('docId', sql.Int, docId);
                denyRequest.input('denialComments', sql.NVarChar, denialComments);
                await denyRequest.query(denyDocumentQuery);

            } else if (action === 'delete') {
                // Delete the document
                const deleteDocumentQuery = `
                    DELETE FROM DOCUMENT WHERE docId = @docId;
                    DELETE FROM RESTRICTED_VIEW WHERE docId = @docId;
                `;
                const deleteRequest = new sql.Request(transaction);
                deleteRequest.input('docId', sql.Int, docId);
                await deleteRequest.query(deleteDocumentQuery);
            }

            // Commit the transaction
            await transaction.commit();
            res.status(200).json({ message: 'Document processed successfully.' });

        } catch (err) {
            await transaction.rollback();
            console.error('Error during moderation:', err);
            res.status(500).json({ message: 'Failed to process document.', error: err.message });
        }

    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    }
};

module.exports = { reportFile, handleRestrictedDocument };
