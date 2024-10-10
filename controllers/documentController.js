/** controllers/documentController.js */

const sql = require('mssql');
const connectToDatabase = require('../config/db');

//get all documents
const getAllDocuments = async (req, res) => {
    try {
        const connection = await connectToDatabase();
        const userRole = req.user.role; 
        const userId = req.user.id; 

        let query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description,
                d.fileName, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                d.status AS documentStatus,
                r.userId AS reporterUserId,
                r.reporting_details,
                r.reporting_timestamp,
                nd.datetime_of_denial,
                a.datetime_of_approval,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
            FROM DOCUMENT d
            LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
            LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
        `;

        if (userRole === 'public' || userRole === 'educator') {
            query += ` WHERE d.status = 'approved' AND NOT EXISTS ( 
                SELECT 1 FROM DOCUMENT_REPORTING rr 
                WHERE rr.docId = d.docId AND rr.userId = @userId 
            ) `;
        }

        const request = new sql.Request(connection);
        request.input('userId', sql.Int, userId);
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
        const userRole = req.user.role; 
        const userId = req.user.id; 

        const query = `
            SELECT 
                docId, 
                module, 
                description,
                fileName,
                author,
                fileSize,
                location,
                university,
                category,
                academicYear,
                userId,
                title, -- Added title
                preview_image_url, -- Added preview image URL
                light_preview_url, -- Added light preview URL
                preview_file_size -- Added preview file size
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
        const userRole = req.user.role; 
        const userId = req.user.id; 

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location,
                d.fileName, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                r.userId AS reporterUserId,
                r.reporting_details,
                r.reporting_timestamp,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
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
        const userRole = req.user.role; 
        const userId = req.user.id; 

        const query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description,
                d.fileName, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                nd.denial_comments,
                d.userId AS documentUserId,
                nd.datetime_of_denial,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
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
        let query;

        query = `
            SELECT 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear,
                d.fileName,
                d.fileType,
                d.fileSize,
                d.pageCount,
                d.author,
                d.creationDate,
                d.modificationDate,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
            FROM DOCUMENT d
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
        const userRole = req.user.role; 

        let query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                d.fileName,
                d.fileType,
                d.fileSize,
                d.pageCount,
                d.author,
                d.creationDate,
                d.modificationDate,
                d.status AS documentStatus,
                r.userId AS reporterUserId,
                r.reporting_details,
                r.reporting_timestamp,
                nd.datetime_of_denial,
                a.datetime_of_approval,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
            FROM DOCUMENT d
            LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
            LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
            WHERE d.docId = @docId`
        
        const request = new sql.Request(connection);
        request.input('docId', sql.Int, id);
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


const searchDocuments = async (req, res) => {
    const { search } = req.query;

    if (!search || search.trim() === '') {
        return res.status(400).json({ message: 'Search entry cannot be empty.' });
    }

    try {
        const connection = await connectToDatabase();
        
        // Get user role from request
        const userRole = req.user.role; // Ensure this is correctly set in your middleware
        let query;
        // Base query to select documents
        if (userRole === 'admin' || userRole === 'moderator'){
            query = `
            SELECT 
                d.docId, 
                d.module, 
                d.description, 
                d.location, 
                d.university, 
                d.category, 
                d.academicYear, 
                d.userId AS documentUserId,
                d.fileName,
                d.fileType,
                d.fileSize,
                d.pageCount,
                d.author,
                d.creationDate,
                d.modificationDate,
                d.status AS documentStatus,
                r.userId AS reporterUserId,
                r.reporting_details,
                r.reporting_timestamp,
                nd.datetime_of_denial,
                a.datetime_of_approval,
                d.title, -- Added title
                d.preview_image_url, -- Added preview image URL
                d.light_preview_url, -- Added light preview URL
                d.preview_file_size -- Added preview file size
                
            FROM DOCUMENT d
            LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
            LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
            LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
            WHERE 
                (d.module LIKE @search OR
                d.description LIKE @search OR
                d.university LIKE @search OR
                d.author LIKE @search OR
                d.fileName LIKE @search OR
                r.reporting_details LIKE @search)
        `;
        }
       

        // Modify the query based on user role
        else{
            query = `
                SELECT 
                    d.module, 
                    d.description, 
                    d.university, 
                    d.category, 
                    d.academicYear, 
                    d.fileName,
                    d.fileType,
                    d.fileSize,
                    d.pageCount,
                    d.author,
                    d.creationDate,
                    d.modificationDate,
                    d.title, -- Added title
                    d.preview_image_url, -- Added preview image URL
                    d.light_preview_url, -- Added light preview URL
                    d.preview_file_size -- Added preview file size
                FROM DOCUMENT d
                LEFT JOIN DOCUMENT_REPORTING r ON d.docId = r.docId
                LEFT JOIN DENIED_DOCUMENT nd ON d.docId = nd.docId
                LEFT JOIN APPROVED_DOCUMENT a ON d.docId = a.docId
                WHERE 
                    (d.module LIKE @search OR
                    d.description LIKE @search OR
                    d.university LIKE @search OR
                    d.author LIKE @search OR
                    d.fileName LIKE @search)
                AND d.status = 'approved'
            `;
        } 

        const request = new sql.Request(connection);
        request.input('search', sql.VarChar, `%${search.trim()}%`);

        const result = await request.query(query);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'No documents found based on the search criteria.' });
        }

        res.status(200).json({ status: 'success', documents: result.recordset });
    } catch (err) {
        console.error('Error searching documents:', err);
        res.status(500).json({ message: 'Failed to search documents', error: err.message });
    }
};


module.exports = {
    getAllDocuments,
    getPendingDocuments,
    getReportedDocuments,
    getDeniedDocuments,
    getApprovedDocuments,
    getDocumentById,
    searchDocuments
};
