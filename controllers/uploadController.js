const sql = require('mssql'); 
const { s3Upload } = require("../utils/azureBlob");
const connectToDatabase = require("../config/db");
const jwt = require('jsonwebtoken');
const { convertToPDF } = require("../utils/conversionUtils");
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb , StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const { exec } = require('child_process');

// Function to read the licensing PDF and return it as a buffer
const readLicensingPDF = async () => {
    const licensingPdfPath = path.join(__dirname, '../assets', 'licensing.pdf');
    return fs.readFileSync(licensingPdfPath);
};

// Function to merge the uploaded PDF with the licensing PDF
const mergePDFs = async (mainPdf, licensingPdf) => {
    const mainDoc = await PDFDocument.load(mainPdf);
    const licensingDoc = await PDFDocument.load(licensingPdf);
    const mergedDoc = await PDFDocument.create();

    const mainPages = await mergedDoc.copyPages(mainDoc, mainDoc.getPageIndices());
    mainPages.forEach((page) => mergedDoc.addPage(page));

    const [licensingPage] = await mergedDoc.copyPages(licensingDoc, [0]);
    mergedDoc.addPage(licensingPage);

    return await mergedDoc.save();
};

// Function to extract the first page as an image
const extractFirstPageImage = async (pdfBuffer, outputPath) => {
    return new Promise((resolve, reject) => {
        const tempPdfPath = path.join(__dirname, 'temp.pdf');
        fs.writeFileSync(tempPdfPath, pdfBuffer);

        // Use pdf-poppler to convert the first page to PNG
        exec(`pdftoppm -f 1 -l 1 -png "${tempPdfPath}" "${outputPath}/preview"`, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            const imagePath = path.join(outputPath, 'preview-1.png');
            resolve(imagePath);
        });
    });
};

// Function to generate a lighter preview PDF
const generateLightPreview = async (pdfBuffer) => {
    const doc = await PDFDocument.load(pdfBuffer);
    const lightDoc = await PDFDocument.create();

    const pageCount = doc.getPageCount();
    const pagesToExtract = Math.min(3, pageCount); // Extract max 3 pages

    // Add the first few pages (up to 3) to the lighter document
    for (let i = 0; i < pagesToExtract; i++) {
        const [page] = await lightDoc.copyPages(doc, [i]);
        lightDoc.addPage(page);
    }

    // Read the licensing PDF and add it as the last page
    const licensingBuffer = await readLicensingPDF();
    const licensingDoc = await PDFDocument.load(licensingBuffer);
    const [licensingPage] = await lightDoc.copyPages(licensingDoc, [0]);
    lightDoc.addPage(licensingPage);
    
    // Add an extra page indicating there are more pages available for download
    const morePagesPage = lightDoc.addPage([600, 400]); // Adjust dimensions as needed
    const { width, height } = morePagesPage.getSize();
    
    // Draw a card-like rectangle
    morePagesPage.drawRectangle({
        x: 50,
        y: height - 300,
        width: 500,
        height: 250,
        color: rgb(0.95, 0.95, 0.95), // Light gray color for the card
        borderColor: rgb(0, 0, 0), // Border color
        borderWidth: 2,
    });

    // Embed the font
    const font = await lightDoc.embedFont(StandardFonts.Helvetica);

    // Draw the title centered in the card
    const title = 'Share2Teach';
    const titleSize = 30;
    const titleWidth = font.widthOfTextAtSize(title, titleSize);
    morePagesPage.drawText(title, {
        x: (width - titleWidth) / 2, // Center the title dynamically
        y: height - 220, // Adjust for card position
        size: titleSize,
        color: rgb(0, 0, 0),
        font, // Use the embedded font
    });

    // Draw the main text centered in the card
    const mainText1 = 'This document has more pages available for download.';
    const mainText2 = 'Please download the full document to view more.';
    const mainTextSize = 16;
    const mainTextWidth1 = font.widthOfTextAtSize(mainText1, mainTextSize);
    const mainTextWidth2 = font.widthOfTextAtSize(mainText2, mainTextSize);

    morePagesPage.drawText(mainText1, {
        x: (width - mainTextWidth1) / 2, // Center the text dynamically
        y: height - 260, // Adjust position
        size: mainTextSize,
        color: rgb(0, 0, 0),
        font, // Use the embedded font
    });

    morePagesPage.drawText(mainText2, {
        x: (width - mainTextWidth2) / 2, // Center the text dynamically
        y: height - 290, // Adjust position
        size: mainTextSize,
        color: rgb(0, 0, 0),
        font, // Use the embedded font
    });

    return await lightDoc.save();
};



const uploadFiles = async (req, res) => {
    let connection;
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const file = req.files[0];

        // File size check (e.g., max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return res.status(400).json({ message: "File size exceeds the 10MB limit" });
        }

        const {title, module, description, university, category, academicYear } = req.body;

        if (!title ||!module || !description || !university || !category || !academicYear) {
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
            userId = decoded.id;
            userRole = decoded.role;
        } catch (err) {
            return res.status(401).json({ message: "Invalid token", error: err.message });
        }

        // Connect to the database
        connection = await connectToDatabase();

        // Check the user's role
        if (!['educator', 'moderator', 'admin'].includes(userRole)) {
            return res.status(403).json({ message: "You do not have permission to upload files" });
        }

        // Convert the file to PDF and extract metadata
        const { pdfBuffer, metadata } = await convertToPDF(file);

        if (!pdfBuffer) {
            return res.status(500).json({ message: "Failed to convert file to PDF" });
        }

        // Read the licensing PDF
        const licensingBuffer = await readLicensingPDF();

        // Merge the uploaded PDF with the licensing PDF
        const mergedPdfBuffer = await mergePDFs(pdfBuffer, licensingBuffer);

        // Generate the first page preview image
        const outputPath = path.join(__dirname, 'temp_images');
        if (!fs.existsSync(outputPath)){
            fs.mkdirSync(outputPath);
        }
        const previewImagePath = await extractFirstPageImage(mergedPdfBuffer, outputPath);
        const previewImageBuffer = fs.readFileSync(previewImagePath);

        // Optimize the image using sharp (optional)
        const optimizedImageBuffer = await sharp(previewImageBuffer)
            .resize(300) // Resize to width of 300px
            .png({ quality: 80 })
            .toBuffer();

        // Upload the preview image to Azure Blob Storage
        const previewImageUrl = await s3Upload({ originalname: path.basename(previewImagePath), buffer: optimizedImageBuffer });

        // Generate a lighter preview PDF
        const lightPreviewBuffer = await generateLightPreview(mergedPdfBuffer);

        // Upload the lighter preview PDF to Azure Blob Storage
        const lightPreviewUpload = await s3Upload({ originalname: `light_${file.originalname.replace(/\.[^/.]+$/, "")}.pdf`, buffer: lightPreviewBuffer });
        const lightPreviewUrl = lightPreviewUpload;

        // Calculate the size of the lighter preview file
        const previewFileSize = lightPreviewBuffer.length;

        // Clean up temporary files
        fs.unlinkSync(path.join(__dirname, 'temp.pdf'));
        fs.unlinkSync(previewImagePath);
        fs.rmdirSync(outputPath, { recursive: true });

        // Upload the merged PDF to Azure Blob Storage
        const url = await s3Upload({ originalname: `${file.originalname.replace(/\.[^/.]+$/, "")}.pdf`, buffer: mergedPdfBuffer });

        if (!url) {
            return res.status(500).json({ message: "Failed to upload PDF to Azure Blob Storage" });
        }

        // Insert document details into the DOCUMENT table with metadata
        const request = new sql.Request(connection);
        request.input('module', sql.VarChar, module)
            .input('title', sql.VarChar, title)
            .input('description', sql.VarChar, description)
            .input('status', sql.VarChar, 'pending')
            .input('location', sql.VarChar, url)
            .input('university', sql.VarChar, university)
            .input('category', sql.VarChar, category)
            .input('academicYear', sql.VarChar, academicYear)
            .input('userId', sql.Int, userId)
            .input('fileSize', sql.BigInt, mergedPdfBuffer.length) // Use the size of the merged PDF buffer
            .input('fileType', sql.VarChar, 'application/pdf') // File type is PDF
            .input('fileName', sql.VarChar, `${file.originalname.replace(/\.[^/.]+$/, "")}.pdf`) // Update file name to include .pdf extension
            .input('pageCount', sql.Int, metadata.pageCount + 1) // Increment page count for licensing page
            .input('author', sql.VarChar, metadata.author || null)
            .input('creationDate', sql.DateTime, metadata.creationDate || null)
            .input('modificationDate', sql.DateTime, metadata.modificationDate || null)
            .input('preview_image_url', sql.VarChar, previewImageUrl)
            .input('light_preview_url', sql.VarChar, lightPreviewUrl)
            .input('preview_file_size', sql.BigInt, previewFileSize);

        const documentResult = await request.query(
            `INSERT INTO DOCUMENT 
            (title, module, description, status, location, university, category, academicYear, userId, fileSize, fileType, fileName, pageCount, author, creationDate, modificationDate, preview_image_url, light_preview_url, preview_file_size)
            OUTPUT inserted.docId 
            VALUES 
            (@title, @module, @description, @status, @location, @university, @category, @academicYear, @userId, @fileSize, @fileType, @fileName, @pageCount, @author, 
            @creationDate, @modificationDate, @preview_image_url, @light_preview_url, @preview_file_size)`
        );

        if (!documentResult.recordset || !documentResult.recordset[0].docId) {
            return res.status(500).json({ message: "Failed to save document details in the database" });
        }

        const docId = documentResult.recordset[0].docId;

        // Insert into PENDING_DOCUMENT table
        await connection.request()
            .input('docId', sql.Int, docId)
            .query(
                'INSERT INTO PENDING_DOCUMENT (docId, datetime_of_upload) VALUES (@docId, GETDATE())'
            );

        res.json({ 
            status: "success", 
            message: "Document uploaded and marked as pending", 
            documentId: docId,
            previewImageUrl: previewImageUrl,
            lightPreviewUrl: lightPreviewUrl
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: "Failed to process file upload", error: err.message });
    }
};

module.exports = { uploadFiles };

