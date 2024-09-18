const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');

// Function to handle reporting a file with severity levels
const reportFile = async (req, res) => {
    const { docId, userId, report_details, severity_level } = req.body; // Add severity level

    try {
        const connection = await connectToDatabase();

        // Start a transaction
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        try {
            // Insert the report into the REPORTS table
            const insertReportQuery = `
                INSERT INTO DOCUMENT_REPORTING (docId, userId, report_details, report_timestamp, severity_level)
                VALUES (@docId, @userId, @report_details, @report_timestamp, @severity_level)
            `;
            const request = new sql.Request(transaction);
            request.input('docId', sql.Int, docId);
            request.input('userId', sql.Int, userId);
            request.input('report_details', sql.NVarChar, report_details);
            request.input('report_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
            request.input('severity_level', sql.NVarChar, severity_level); // New severity level field
            await request.query(insertReportQuery);

            // Commit the transaction
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

        // Get the report details including the severity level
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

        // Take actions based on the severity level
        switch (severity) {
            case 'minor':
                // Minor infractions can pass a second round of moderation
                res.status(200).json({ message: 'Minor infraction. Marked for review.' });
                break;
            case 'moderate':
                // Moderate infractions may require manual moderation or warning
                res.status(200).json({ message: 'Moderate infraction. Awaiting further moderation.' });
                break;
            case 'egregious':
                // Egregious infractions should be immediately deleted
                const deleteQuery = `
                    DELETE FROM DOCUMENT_REPORTING
                    WHERE report_id = @reportId;
                `;
                await request.query(deleteQuery);
                res.status(200).json({ message: 'Egregious infraction. Content deleted.' });
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
