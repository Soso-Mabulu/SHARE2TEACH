const { Connection, Request, TYPES } = require('tedious');
const moment = require('moment-timezone');
const connectToDatabase = require('../config/db');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

// Function to handle reporting a file
const reportFile = async (req, res) => {
    const { docId, userId, report_details } = req.body;

    try {
        const connection = await connectToDatabase();

        // Start a transaction
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        // Extract userId from JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        // Verify token and extract userId
        let userId, userRole;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id;  // Extract userId
            userRole = decoded.role;  // Extract userRole
        } catch (err) {
            return res.status(401).json({ message: "Invalid token", error: err.message });
        }

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