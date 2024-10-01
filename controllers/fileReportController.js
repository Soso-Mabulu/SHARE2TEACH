const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

// Function to handle reporting a file with severity levels
const reportFile = async (req, res) => {
    const { docId, userId, reporting_details, severity_level } = req.body;

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

            // Handle different severity levels
            if (severity_level === "minor") {
                // Insert the report into the DOCUMENT_REPORTING table
                const insertReportQuery = `
                    INSERT INTO DOCUMENT_REPORTING (docId, userId, reporting_details, reporting_timestamp, severity_level)
                    VALUES (@docId, @userId, @reporting_details, @reporting_timestamp, @severity_level)
                `;
                const request = new sql.Request(transaction);
                request.input('docId', sql.Int, docId);
                request.input('userId', sql.Int, userId);
                request.input('reporting_details', sql.NVarChar, reporting_details);
                request.input('reporting_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
                request.input('severity_level', sql.NVarChar, severity_level);
                await request.query(insertReportQuery);

            } else if (severity_level === "moderate") {
                // Insert the report into the DOCUMENT_REPORTING table
                const insertReportQuery = `
                    INSERT INTO DOCUMENT_REPORTING (docId, userId, reporting_details, reporting_timestamp, severity_level)
                    VALUES (@docId, @userId, @reporting_details, @reporting_timestamp, @severity_level)
                `;
                const request = new sql.Request(transaction);
                request.input('docId', sql.Int, docId);
                request.input('userId', sql.Int, userId);
                request.input('reporting_details', sql.NVarChar, reporting_details);
                request.input('reporting_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
                request.input('severity_level', sql.NVarChar, severity_level);
                await request.query(insertReportQuery);

                // Update the document status to "reported" in the DOCUMENT table
                const updateDocumentStatusQuery = `
                    UPDATE DOCUMENT SET status = 'reported' WHERE docId = @docId
                `;
                const updateRequest = new sql.Request(transaction);
                updateRequest.input('docId', sql.Int, docId);
                await updateRequest.query(updateDocumentStatusQuery);

            } else if (severity_level === "severe") {
                // Handle document deletion for "egregious" severity
                const deleteFromDocumentQuery = `
                    UPDATE DOCUMENT SET status = 'banned' WHERE docId = @docId
                `;
                const deleteRequest = new sql.Request(transaction);
                deleteRequest.input('docId', sql.Int, docId);

                // Perform deletions in order to avoid FK constraint issues
                await deleteRequest.query(deleteFromDocumentQuery); // Finally, delete from DOCUMENT
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
