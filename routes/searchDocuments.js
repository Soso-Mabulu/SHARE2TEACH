const express = require('express');
const sql = require('mssql');
const router = express.Router();
const connectToDatabase = require('../config/db');

router.get('/', async (req, res) => {
    const { search } = req.query;  // single search input

    try {
        const connection = await connectToDatabase();

        let query = `
            SELECT docId, module, description, status, location, university, category, academicYear, userId
            FROM DOCUMENT
            WHERE 1=1
        `;
        const request = new sql.Request(connection);

        if (search) {
            query += `
                AND (
                    module LIKE @search OR
                    description LIKE @search OR
                    university LIKE @search OR
                    category LIKE @search OR
                    academicYear LIKE @search
                )
            `;
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
