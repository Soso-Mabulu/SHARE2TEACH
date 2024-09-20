const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');

// Function to handle reporting a file with severity levels
const reportFile = async (req, res) => {
    const { docId, userId, report_details, severity_level } = req.body;

    // Validate inputs
    if (!docId || !userId || !report_details || !severity_level) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate severity level
    const validSeverityLevels = ['minor', 'moderate', 'egregious'];
    if (!validSeverityLevels.includes(severity_level)) {
        return res.status(400).json({ message: 'Invalid severity level' });
    }

    let connection;
    try {
        connection = await connectToDatabase();

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
            request.input('severity_level', sql.NVarChar, severity_level);
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
        console.error('Database connection error:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    } finally {
        if (connection) {
            connection.close();
        }
    }
};

// Function to review a report based on severity level (moderator only)
const reviewReport = async (req, res) => {
    const { reportId } = req.params;

    // Validate reportId
    if (!reportId) {
        return res.status(400).json({ message: 'Report ID is required' });
    }

    // Ensure the user is a moderator
    if (!req.user || req.user.role !== 'moderator') {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }

    let connection;
    try {
        connection = await connectToDatabase();
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
        let responseMessage;
        switch (severity) {
            case 'minor':
                responseMessage = 'Minor infraction. Marked for review.';
                break;
            case 'moderate':
                responseMessage = 'Moderate infraction. Awaiting further moderation.';
                break;
            case 'egregious':
                // Egregious infractions should be immediately deleted
                const deleteQuery = `
                    DELETE FROM DOCUMENT_REPORTING
                    WHERE report_id = @reportId;
                `;
                await request.query(deleteQuery);
                responseMessage = 'Egregious infraction. Content deleted.';
                break;
            default:
                return res.status(400).json({ message: 'Unknown severity level.' });
        }

        // Update the report with moderator details and review timestamp
        const updateReportQuery = `
            UPDATE DOCUMENT_REPORTING
            SET reviewed_by = @reviewed_by, review_timestamp = @review_timestamp
            WHERE report_id = @reportId
        `;
        const updateRequest = new sql.Request(connection);
        updateRequest.input('reviewed_by', sql.Int, req.user.id); // Assuming `req.user.id` contains the moderator's ID
        updateRequest.input('review_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
        updateRequest.input('reportId', sql.Int, reportId);
        await updateRequest.query(updateReportQuery);

        res.status(200).json({ message: responseMessage });
    } catch (err) {
        console.error('Error reviewing report:', err);
        res.status(500).json({ message: 'Failed to review report.', error: err.message });
    } finally {
        if (connection) {
            connection.close();
        }
    }
};

module.exports = { reportFile, reviewReport };
