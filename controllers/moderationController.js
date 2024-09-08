// ./controllers/moderationController.js        
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

// Function to approve or deny a document
const moderateDocument = async (req, res) => {
    const { docId } = req.params;
    const { action } = req.body; // 'approve' or 'deny'

    if (!['approve', 'deny'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action. Use "approve" or "deny".' });
    }

    try {
        const connection = await connectToDatabase();

        // Start a transaction
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        try {
            // Retrieve the document
            const getDocQuery = `SELECT * FROM DOCUMENT WHERE docId = @docId AND status = 'pending'`;
            const request = new sql.Request(transaction);
            request.input('docId', sql.Int, docId);
            const docResult = await request.query(getDocQuery);

            if (!docResult.recordset.length) {
                return res.status(404).json({ message: 'Document not found or already moderated.' });
            }

            // Determine the target table and status based on action
            const targetTable = action === 'approve' ? 'APPROVED_DOCUMENT' : 'DENIED_DOCUMENT';
            const status = action === 'approve' ? 'approved' : 'denied';
            const timestampField = action === 'approve' ? 'datetime_of_approval' : 'datetime_of_denial';

            // Insert into the target table with the timestamp
            const insertDocQuery = `
                INSERT INTO ${targetTable} (docId, ${timestampField})
                VALUES (@docId, GETDATE())
            `;
            await request.query(insertDocQuery);

            // Update the status of the document in the DOCUMENT table
            const updateDocQuery = `
                UPDATE DOCUMENT
                SET status = @status
                WHERE docId = @docId
            `;
            request.input('status', sql.NVarChar, status);
            await request.query(updateDocQuery);

            // Commit the transaction
            await transaction.commit();

            res.status(200).json({ message: `Document successfully ${action}d.` });
        } catch (err) {
            await transaction.rollback();
            console.error('Error during moderation:', err);
            res.status(500).json({ message: `Failed to ${action} document.`, error: err.message });
        }
    } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).json({ message: 'Database connection error.', error: err.message });
    }
};

module.exports = { getPendingDocuments, moderateDocument };
