const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');

// Function to handle reporting a file and checking its severity
const reportFile = async (req, res) => {
    const { docId, userId, reporting_details } = req.body;  // No severity_level in the input

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

            // Check the total number of reports for this document
            const checkReportCountQuery = `
                SELECT COUNT(*) AS report_count FROM DOCUMENT_REPORTING WHERE docId = @docId
            `;
            const countRequest = new sql.Request(transaction);
            countRequest.input('docId', sql.Int, docId);
            const reportCountResult = await countRequest.query(checkReportCountQuery);

            const reportCount = reportCountResult.recordset[0].report_count;

            if (reportCount >= 10) {
                // If reported more than 10 times, mark the document as "severe" and update status
                const updateDocumentStatusQuery = `
                    UPDATE DOCUMENT SET status = 'reported' WHERE docId = @docId
                `;
                const updateDocStatusRequest = new sql.Request(transaction);
                updateDocStatusRequest.input('docId', sql.Int, docId);
                await updateDocStatusRequest.query(updateDocumentStatusQuery);
            }

            // Commit the transaction
            await transaction.commit();
            res.status(200).json({ message: 'File reported successfully.' });

        } catch (err) {
            await transaction.rollback(); // Ensure rollback on any error within the transaction
            console.error('Error during transaction:', err);
            res.status(500).json({ message: 'Failed to report file.', error: err.message });
        }

    } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    }
};

module.exports = { reportFile };
