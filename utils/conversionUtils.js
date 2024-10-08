require('dotenv').config(); // Load environment variables from .env
const axios = require('axios'); // For making HTTP requests
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth'); // For Word files
const xlsx = require('xlsx'); // For Excel files
const puppeteer = require('puppeteer'); // For rendering Excel and PowerPoint files to PDF
const FormData = require('form-data'); // For form data
const unzipper = require('unzipper');
const xml2js = require('xml2js');
const fs = require('fs'); // For file operations
const libre = require('libreoffice-convert'); // Import libreoffice-convert

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT; // API key from .env
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2/convert'; // CloudConvert API URL
const CLOUDCONVERT_UPLOAD_URL = 'https://api.cloudconvert.com/v2/import/upload'; // CloudConvert file upload URL

const todayDate = new Date().toISOString(); // Today's date in ISO 8601 format

// Utility function to handle conversion to PDF and metadata extraction
async function convertToPDF(file) {
    let pdfBuffer;
    let metadata = {};

    try {
        switch (file.mimetype) {
            case 'application/pdf':
                pdfBuffer = file.buffer; // If already a PDF, no conversion needed
                metadata = await extractPDFMetadata(pdfBuffer);
                break;
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                pdfBuffer = await convertFileToPDF(file.buffer, 'doc');
                metadata = await extractWordMetadata(file.buffer);
                break;
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                pdfBuffer = await convertFileToPDF(file.buffer, 'xls');
                metadata = await extractExcelMetadata(file.buffer);
                break;
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                pdfBuffer = await convertFileToPDF(file.buffer, 'ppt');
                metadata = await extractPowerPointMetadata(file.buffer);
                break;
            default:
                throw new Error('Unsupported file type for conversion');
        }
    } catch (error) {
        console.error('Failed to process file upload', error);
        throw new Error('Failed to process file upload');
    }

    return { pdfBuffer, metadata };
}

// Function to convert a file using either LibreOffice or CloudConvert
async function convertFileToPDF(buffer, inputFormat) {
    try {
        // Attempt conversion using LibreOffice
        const outputFileBuffer = await new Promise((resolve, reject) => {
            libre.convert(buffer, 'pdf', undefined, (err, result) => {
                if (err) {
                    return reject(err); // Handle conversion errors
                }
                resolve(result); // Return the converted file buffer
            });
        });

        // Return the converted PDF buffer
        return outputFileBuffer;

    } catch (error) {
        console.error('Failed to convert file to PDF using LibreOffice:', error);

        // Fallback to CloudConvert if LibreOffice conversion fails
        try {
            // Step 1: Upload the file
            const uploadResponse = await axios.post(CLOUDCONVERT_UPLOAD_URL, {
                file: buffer,
            }, {
                headers: {
                    Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            const uploadFileId = uploadResponse.data.data.id; // Get the uploaded file ID

            // Step 2: Convert the file
            const convertResponse = await axios.post(CLOUDCONVERT_API_URL, {
                tasks: {
                    'upload-file': { operation: 'import/upload', filename: uploadFileId },
                    'convert-file': { 
                        operation: 'convert', 
                        input: 'upload-file', 
                        output_format: 'pdf', 
                        engine: 'office' 
                    },
                    'export-file': { operation: 'export/url', input: 'convert-file' },
                },
            }, {
                headers: {
                    Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            // Handle success response
            console.log('File converted successfully using CloudConvert:', convertResponse.data);
            return convertResponse.data; // Return the conversion result for further processing

        } catch (cloudError) {
            console.error('Failed to convert file to PDF using CloudConvert:', cloudError);
            throw new Error('Failed to convert file to PDF');
        }
    }
}
// Extract PDF metadata
async function extractPDFMetadata(buffer) {
    try {
        const pdfDoc = await PDFDocument.load(buffer);
        return {
            pageCount: pdfDoc.getPageCount(),
            author: pdfDoc.getAuthor() || 'Unknown',
            creationDate: pdfDoc.getCreationDate() ? formatDate(pdfDoc.getCreationDate()) : todayDate,
            modificationDate: pdfDoc.getModificationDate() ? formatDate(pdfDoc.getModificationDate()) : todayDate,
        };
    } catch (error) {
        console.error('Failed to extract PDF metadata', error);
        throw error;
    }
}

// Extract Word metadata
async function extractWordMetadata(buffer) {
    try {
        const { value: text } = await mammoth.extractRawText({ buffer });
        const { author, created } = await mammoth.convertToHtml({ buffer });
        return {
            content: text,
            author: author || 'Unknown',
            creationDate: created ? formatDate(new Date(created)) : todayDate,
        };
    } catch (error) {
        console.error('Failed to extract Word metadata', error);
        throw error;
    }
}

// Extract Excel metadata
async function extractExcelMetadata(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        return {
            sheetCount: workbook.SheetNames.length,
            author: workbook.Props?.Author || 'Unknown',
            creationDate: workbook.Props?.Created ? formatDate(new Date(workbook.Props.Created)) : todayDate,
        };
    } catch (error) {
        console.error('Failed to extract Excel metadata', error);
        throw error;
    }
}

// Extract PowerPoint metadata
async function extractPowerPointMetadata(buffer) {
    try {
        const tempFilePath = './temp.pptx'; // Define a temporary file path
        fs.writeFileSync(tempFilePath, buffer); // Write the buffer to a temporary file

        // Read the PowerPoint file and extract metadata
        const unzipStream = fs.createReadStream(tempFilePath).pipe(unzipper.Parse());
        let slideCount = 0;
        let author = 'Unknown';
        let creationDate = todayDate;

        for await (const entry of unzipStream) {
            const fileName = entry.path;

            // Check for slides (ppt/slides/slideX.xml)
            if (fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')) {
                slideCount++;
            }

            // Check for document properties (docProps/core.xml)
            if (fileName === 'docProps/core.xml') {
                let xmlContent = '';
                entry.on('data', chunk => xmlContent += chunk); // Collect XML content
                entry.on('end', () => {
                    // Parse the XML content to extract author and creation date
                    const parser = new xml2js.Parser();
                    parser.parseString(xmlContent, (err, result) => {
                        if (err) {
                            console.error('Failed to parse PowerPoint core properties', err);
                        } else {
                            author = result['dc:creator'] ? result['dc:creator'][0] : author;
                            creationDate = result['dcterms:created'] ? formatDate(new Date(result['dcterms:created'][0])) : creationDate;
                        }
                    });
                });
            }
            entry.autodrain(); // Drain the entry
        }

        // Clean up temporary file
        fs.unlinkSync(tempFilePath); // Remove temporary file

        return {
            slideCount,
            author,
            creationDate,
        };
    } catch (error) {
        console.error('Failed to extract PowerPoint metadata', error);
        throw error;
    }
}

// Helper function to format dates
function formatDate(date) {
    return date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
}

// Exporting functions
module.exports = {
    convertToPDF,
    extractPDFMetadata,
    extractWordMetadata,
    extractExcelMetadata,
    extractPowerPointMetadata,
};