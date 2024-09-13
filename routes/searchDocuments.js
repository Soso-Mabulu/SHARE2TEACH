const express = require('express');
const sql = require('mssql');
const router = express.Router();
const connectToDatabase = require('../config/db');
const authorize = require('../middleware/authorize');

// Apply authorization middleware (allow all roles to access this route)
router.get('/', authorize(['public', 'moderator', 'admin']), async (req, res) => {
    const { search } = req.query;  // single search input
    const { role } = req.user;      // Extract the user's role from the request

    try {
        const connection = await connectToDatabase();
        let query = `
            SELECT docId, module, description, status, location, university, category, academicYear, userId
            FROM DOCUMENT
        `;

        // Only public users should see approved documents
        if (role === 'public') {
            query += ` WHERE status = 'approved'`;
        }

        // Add search functionality (works for all users)
        if (search) {
            query += role === 'public' ? ' AND (' : ' WHERE (';
            query += `
                module LIKE @search OR
                description LIKE @search OR
                university LIKE @search OR
                category LIKE @search OR
                academicYear LIKE @search
            )`;
        }

        const request = new sql.Request(connection);
        if (search) {
            request.input('search', sql.VarChar, `%${search}%`);
        }

        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: "No documents found matching the search criteria" });
        }

        res.json(result.recordset);
    } catch (err) {
        console.error('Error retrieving documents:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

module.exports = router;
