const sql = require('mssql');
const { s3Upload } = require("../utils/azureBlob");
const connectToDatabase = require("../config/db");
const jwt = require('jsonwebtoken');

const uploadFiles = async (req, res) => {
    let connection;
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const file = req.files[0];

        // File size check (e.g., max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return res.status(400).json({ message: "File size exceeds the 5MB limit" });
        }

        // File type check
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).json({ message: "Only PDF files are allowed" });
        }

        const { module, description, university, category, academicYear } = req.body;

        // Debugging: Check the request body
        console.log('Request Body:', { module, description, university, category, academicYear });

        if (!module || !description || !university || !category || !academicYear) {
            return res.status(400).json({ message: "Missing required fields in the request body" });
        }

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

        // Connect to the database
        connection = await connectToDatabase();

        // Check the user's role
        if (!['educator', 'moderator', 'admin'].includes(userRole)) {
            return res.status(403).json({ message: "You do not have permission to upload files" });
        }

        // Upload file to Azure Blob Storage
        const url = await s3Upload(file);

        if (!url) {
            return res.status(500).json({ message: "Failed to upload file to Azure Blob Storage" });
        }

        // Ensure all parameters are defined before SQL execution
        const parameters = [module, description, 'pending', url, university, category, academicYear, userId];
        if (parameters.some(param => param === undefined || param === null)) {
            return res.status(500).json({ message: "Undefined parameter(s) found" });
        }

        // Insert document details into the DOCUMENT table
        const request = new sql.Request(connection);
        request.input('module', sql.VarChar, module)
            .input('description', sql.VarChar, description)
            .input('status', sql.VarChar, 'pending')
            .input('location', sql.VarChar, url)
            .input('university', sql.VarChar, university)
            .input('category', sql.VarChar, category)
            .input('academicYear', sql.VarChar, academicYear)
            .input('userId', sql.Int, userId);

        const documentResult = await request.query(
            `INSERT INTO DOCUMENT (module, description, status, location, university, category, academicYear, userId) 
             OUTPUT inserted.docId 
             VALUES (@module, @description, @status, @location, @university, @category, @academicYear, @userId)`
        );

        if (!documentResult.recordset || !documentResult.recordset[0] || !documentResult.recordset[0].docId) {
            return res.status(500).json({ message: "Failed to save document details in the database" });
        }

        const docId = documentResult.recordset[0].docId;

        // Insert into PENDING_DOCUMENT table
        await connection.request()
            .input('docId', sql.Int, docId)
            .query(
                'INSERT INTO PENDING_DOCUMENT (docId, datetime_of_upload) VALUES (@docId, GETDATE())'
            );

        res.json({ status: "success", message: "Document uploaded and marked as pending", documentId: docId });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: "Failed to verify user role or save document", error: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
};

module.exports = { uploadFiles };
