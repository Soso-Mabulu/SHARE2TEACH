const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

// Function to handle reporting a file with severity levels
const reportFile = async (req, res) => {
    const { docId, report_details, severity_level } = req.body; // Removed userId from the request body as it comes from JWT

    try {
        const connection = await connectToDatabase();
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        // Extract userId from JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        let userId, userRole;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;  // Extract userId from JWT
            userRole = decoded.role;  // Extract userRole from JWT
        } catch (err) {
            return res.status(401).json({ message: "Invalid token", error: err.message });
        }

        try {
            const insertReportQuery = `
                INSERT INTO DOCUMENT_REPORTING (docId, userId, report_details, report_timestamp, severity_level)
                VALUES (@docId, @userId, @report_details, @report_timestamp, @severity_level)
            `;
            const request = new sql.Request(transaction);
            request.input('docId', sql.Int, docId);
            request.input('userId', sql.Int, userId);
            request.input('report_details', sql.NVarChar, report_details);
            request.input('report_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
            request.input('severity_level', sql.NVarChar, severity_level);
            await request.query(insertReportQuery);

            await transaction.commit();
            res.status(200).json({ message: 'File reported successfully.' });
        } catch (err) {
            await transaction.rollback();
            console.error('Error reporting file:', err);
            res.status(500).json({ message: 'Failed to report file.', error: err.message });
        }
    } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    }
};

// Function to review a report based on severity level
const reviewReport = async (req, res) => {
    const { reportId } = req.params;

    try {
        const connection = await connectToDatabase();
        const request = new sql.Request(connection);

        const selectReportQuery = `
            SELECT docId, userId, report_details, report_timestamp, severity_level
            FROM DOCUMENT_REPORTING
            WHERE report_id = @reportId
        `;
        request.input('reportId', sql.Int, reportId);
        const result = await request.query(selectReportQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Report not found.' });
        }

        const report = result.recordset[0];
        const severity = report.severity_level;

        switch (severity) {
            case 'minor':
                // Hide document for the user who reported it, move it to 'reported and reviewed'
                const hideDocQuery = `
                    UPDATE DOCUMENTS SET status = 'reported and reviewed'
                    WHERE docId = @docId;
                    DELETE FROM DOCUMENT_REPORTING WHERE report_id = @reportId;
                `;
                request.input('docId', sql.Int, report.docId);
                await request.query(hideDocQuery);
                res.status(200).json({ message: 'Minor infraction. Document moved to "reported and reviewed" and hidden from reporter.' });
                break;

            case 'moderate':
                // Allow the moderator to review, move to pending or denied based on review
                const updateModerateDocQuery = `
                    UPDATE DOCUMENTS SET status = CASE 
                        WHEN status = 'denied' THEN 'denied'
                        ELSE 'pending'
                    END
                    WHERE docId = @docId;
                    DELETE FROM DOCUMENT_REPORTING WHERE report_id = @reportId;
                `;
                request.input('docId', sql.Int, report.docId);
                await request.query(updateModerateDocQuery);
                res.status(200).json({ message: 'Moderate infraction. Document moved to "pending" or "denied" based on review.' });
                break;

            case 'egregious':
                // Delete the document and mark it as denied
                const deleteEgregiousQuery = `
                    DELETE FROM DOCUMENTS WHERE docId = @docId;
                    DELETE FROM DOCUMENT_REPORTING WHERE report_id = @reportId;
                `;
                request.input('docId', sql.Int, report.docId);
                await request.query(deleteEgregiousQuery);
                res.status(200).json({ message: 'Egregious infraction. Document deleted and report removed.' });
                break;

            default:
                res.status(400).json({ message: 'Unknown severity level.' });
        }
    } catch (err) {
        console.error('Error reviewing report:', err);
        res.status(500).json({ message: 'Failed to review report.', error: err.message });
    }
};

module.exports = { reportFile, reviewReport };
