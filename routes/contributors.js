const express = require('express');
const router = express.Router();
const sql = require('mssql');
const connectToDatabase = require('../config/db');
const authorize = require('../middleware/authorize');

// Middleware to ensure only authorized users can access this route
router.use(authorize(['admin', 'public', 'moderator', 'educator'])); 

// GET /contributors - Retrieves users who have uploaded documents, their roles, and the count of their documents
router.get('/', authorize(['admin', 'moderator', 'public', 'educator']), async (req, res) => {
    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();

        // SQL query to fetch distinct user_ids from the documents table, along with first and last name, role, and document count
        const query = `
            SELECT 
                u.userId, 
                u.userName AS firstName, 
                u.userLName AS lastName, 
                u.userType AS role, 
                COUNT(d.docId) AS documentCount
            FROM 
                DOCUMENT d
            INNER JOIN 
                [User] u ON d.userId = u.userId
            GROUP BY 
                u.userId, u.userName, u.userLName, u.userType
        `;

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No contributors found.' });
        }

        // Return the contributors along with their document count
        res.status(200).json({ contributors: result.recordset });
    } catch (err) {
        console.error('Error retrieving contributors:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    } 
});

module.exports = router;
