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

const generateLightPreviewImage = async (pdfBuffer, outputPath) => {
    const tempPdfPath = path.join(__dirname, 'temp_light.pdf');
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Step 1: Read the licensing PDF
    const licensePdfBuffer = await readLicensingPDF();
    const licensePdfPath = path.join(outputPath, 'license.pdf');
    fs.writeFileSync(licensePdfPath, licensePdfBuffer); // Save the licensing PDF to the output path

    // Step 2: Merge the license PDF with the temp PDF
    const mergedPdfPath = path.join(outputPath, 'merged_preview.pdf');

    // Return a promise to handle the exec calls
    return new Promise((resolve, reject) => {
        exec(`pdfunite "${licensePdfPath}" "${tempPdfPath}" "${mergedPdfPath}"`, (error) => {
            if (error) {
                console.error(`Error merging PDFs: ${error}`);
                return reject(error);
            }

            // Step 3: Extract up to the first 3 pages of the merged PDF to PNG
            exec(`pdftoppm -f 1 -l 3 -png "${mergedPdfPath}" "${outputPath}/light_preview"`, (error) => {
                if (error) {
                    console.error(`Error extracting images: ${error}`);
                    return reject(error);
                }
                
                const images = [];
                for (let i = 1; i <= 3; i++) {
                    const imagePath = path.join(outputPath, `light_preview-${i}.png`);
                    images.push(imagePath);
                }
                console.log('Generated light preview images:', images);
                resolve(images); // Resolve the promise with the array of image paths
            });
        });
    });
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

        const { title, module, description, university, category, academicYear } = req.body;

        if (!title || !module || !description || !university || !category || !academicYear) {
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
        if (!fs.existsSync(outputPath)) {
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

        // Generate lighter preview images
        const lightPreviewImagePaths = await generateLightPreviewImage(pdfBuffer, outputPath);
        
        // Upload each lighter preview image to Azure Blob Storage
        const lightPreviewImageUrls = await Promise.all(lightPreviewImagePaths.map(async (lightPreviewImagePath) => {
            const lightPreviewImageBuffer = fs.readFileSync(lightPreviewImagePath);
            const optimizedLightPreviewImageBuffer = await sharp(lightPreviewImageBuffer)
                .resize(300) // Resize to width of 300px
                .png({ quality: 80 })
                .toBuffer();
            return await s3Upload({ originalname: path.basename(lightPreviewImagePath), buffer: optimizedLightPreviewImageBuffer });
        }));

        // Clean up temporary files
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
            .input('light_preview_url', sql.VarChar, lightPreviewImageUrls.join(','))
            .input('preview_file_size', sql.BigInt, lightPreviewImageUrls.length * optimizedImageBuffer.length); // Adjust as needed

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
            lightPreviewUrls: lightPreviewImageUrls // Change to plural to indicate multiple URLs
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ message: "Failed to process file upload", error: err.message });
    }
};

module.exports = { uploadFiles };

