const sql = require('mssql');
const connectToDatabase = require('../config/db');

// getPendingDocuments function
const getPendingDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT docId, module, description, location, university, category, academicYear, userId 
            FROM DOCUMENT
            WHERE status = 'pending'
        `;
        
        const request = new sql.Request(connection);
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No pending documents found.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error retrieving pending documents:', err);
        res.status(500).json({ message: 'Failed to retrieve pending documents', error: err.message });
    }
};

module.exports = { getPendingDocuments };
