/** controllers/documentController.js */

const sql = require('mssql');
const connectToDatabase = require('../config/db');

// Get all documents
// Get all documents with all related details
const getAllDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                d.status AS documentStatus,
                r.userId AS reporterUserId,
                r.report_details,
                r.report_timestamp,
                nd.datetime_of_denial,
                a.datetime_of_approval
            FROM DOCUMENT d
            LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
            LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
        `;

        const request = new sql.Request(connection);
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No documents found.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error retrieving documents:', err);
        res.status(500).json({ message: 'Failed to retrieve documents', error: err.message });
    }
};


// Get pending documents
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

// Get reported documents
const getReportedDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                r.userId AS reporterUserId,
                r.report_details,
                r.report_timestamp
            FROM DOCUMENT d
            INNER JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
        `;
        
        const request = new sql.Request(connection);
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No reported documents found.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error retrieving reported documents:', err);
        res.status(500).json({ message: 'Failed to retrieve reported documents', error: err.message });
    }
};


// Get denied documents
const getDeniedDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                nd.datetime_of_denial
            FROM DOCUMENT d
            INNER JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            WHERE d.status = 'denied'
        `;
        
        const request = new sql.Request(connection);
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No denied documents found.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error retrieving denied documents:', err);
        res.status(500).json({ message: 'Failed to retrieve denied documents', error: err.message });
    }
};


// Get approved documents
const getApprovedDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                a.datetime_of_approval
            FROM DOCUMENT d
            INNER JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
            WHERE d.status = 'approved'
        `;
        
        const request = new sql.Request(connection);
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No approved documents found.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error retrieving approved documents:', err);
        res.status(500).json({ message: 'Failed to retrieve approved documents', error: err.message });
    }
};

// Get a document by ID
// Get a document by ID with all related details
const getDocumentById = async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await connectToDatabase();

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                d.status AS documentStatus,
                r.userId AS reporterUserId,
                r.report_details,
                r.report_timestamp,
                nd.datetime_of_denial,
                a.datetime_of_approval
            FROM DOCUMENT d
            LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
            LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
            WHERE d.docId = @docId
        `;

        const request = new sql.Request(connection);
        request.input('docId', sql.Int, id);  // Adjust the type based on your schema, might be sql.Int or sql.VarChar
        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        res.status(200).json({ status: 'success', document: result.recordset[0] });
    } catch (err) {
        console.error('Error retrieving document:', err);
        res.status(500).json({ message: 'Failed to retrieve document', error: err.message });
    }
};


module.exports = {
    getAllDocuments,
    getPendingDocuments,
    getReportedDocuments,
    getDeniedDocuments,
    getApprovedDocuments,
    getDocumentById
};
