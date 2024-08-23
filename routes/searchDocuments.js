const express = require('express');
const sql = require('mssql');
const router = express.Router();
const connectToDatabase = require('../config/db');


router.get('/', async (req, res) => {
    const { module, description, university, category, academicYear } = req.query;

    try {
        const connection = await connectToDatabase();

        let query = `
            SELECT docId, module, description, status, location, university, category, academicYear, userId
            FROM DOCUMENT
            WHERE 1=1
        `;
        const request = new sql.Request(connection);

        if (module) {
            query += ' AND module LIKE @module';
            request.input('module', sql.VarChar, `%${module}%`);
        }
        if (description) {
            query += ' AND description LIKE @description';
            request.input('description', sql.VarChar, `%${description}%`);
        }
        if (university) {
            query += ' AND university LIKE @university';
            request.input('university', sql.VarChar, `%${university}%`);
        }
        if (category) {
            query += ' AND category LIKE @category';
            request.input('category', sql.VarChar, `%${category}%`);
        }
        if (academicYear) {
            query += ' AND academicYear = @academicYear';
            request.input('academicYear', sql.VarChar, academicYear);
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
