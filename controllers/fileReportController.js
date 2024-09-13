const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');

// Function to handle reporting a file
const reportFile = async (req, res) => {
    const { docId, userId, report_details } = req.body;

    try {
        const connection = await connectToDatabase();

        // Start a transaction
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        try {
            // Insert the report into the REPORTS table
            const insertReportQuery = `
                INSERT INTO DOCUMENT_REPORTING (docId, userId, report_details, report_timestamp)
                VALUES (@docId, @userId, @report_details, @report_timestamp)
            `;
            const request = new sql.Request(transaction);
            request.input('docId', sql.Int, docId);
            request.input('userId', sql.Int, userId);
            request.input('report_details', sql.NVarChar, report_details);
            request.input('report_timestamp', sql.DateTime, moment().tz('Africa/Johannesburg').toDate());
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

module.exports = { reportFile };


/* Function to deny a report
const denyReport = (req, res) => {
    const { id } = req.params;

    const connection = connectToDatabase(); // Use your custom database connection method

    connection.on('connect', async (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to connect to the database' });
        }

        try {
            const updateQuery = `
                UPDATE DOCUMENT_REPORTING SET report_details = 'denied' WHERE report_id = @id;
                INSERT INTO deniedDocuments (file_id, reported_by, report_details, reported_at)
                SELECT file_id, reported_by, report_details, reported_at FROM REPORTS WHERE report_id = @id;
                DELETE FROM REPORTS WHERE report_id = @id;
            `;
            const request = new Request(updateQuery, (err) => {
                if (err) {
                    throw new Error('Failed to deny the report');
                }
            });

            request.addParameter('id', TYPES.Int, id);

            await new Promise((resolve, reject) => {
                request.on('requestCompleted', resolve);
                request.on('error', reject);
                connection.execSql(request);
            });

            res.status(200).json({ message: 'Report denied and moved to deniedDocuments' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        } finally {
            connection.close();
        }
    });

    connection.connect();
};
*/

module.exports = {
    reportFile,
    //denyReport,
};
