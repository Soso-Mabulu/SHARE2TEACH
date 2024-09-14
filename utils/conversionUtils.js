const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');  // For Word files
const xlsx = require('xlsx');  // For Excel files
const puppeteer = require('puppeteer');  // For rendering Excel and PowerPoint files to PDF

const todayDate = new Date().toISOString(); // Today's date in ISO 8601 format

// Utility function to handle conversion to PDF and metadata extraction
async function convertToPDF(file) {
    let pdfBuffer;
    let metadata = {};

    try {
        switch (file.mimetype) {
            case 'application/pdf':
                pdfBuffer = file.buffer;  // If already a PDF, no conversion needed
                metadata = await extractPDFMetadata(pdfBuffer);
                break;
            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                pdfBuffer = await convertWordToPDF(file.buffer);
                metadata = await extractWordMetadata(file.buffer);
                break;
            case 'application/vnd.ms-excel':
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                pdfBuffer = await convertExcelToPDF(file.buffer);
                metadata = await extractExcelMetadata(file.buffer);
                break;
            case 'application/vnd.ms-powerpoint':
            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                pdfBuffer = await convertPowerPointToPDF(file.buffer);
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

// Convert Word file buffer to PDF using mammoth
async function convertWordToPDF(buffer) {
    try {
        const { value: htmlContent } = await mammoth.convertToHtml({ buffer });
        return await htmlToPDF(htmlContent);  // Convert the HTML output to PDF
    } catch (error) {
        console.error('Failed to convert Word file to PDF', error);
        throw error;
    }
}

// Convert Excel file to PDF using Puppeteer
async function convertExcelToPDF(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const htmlContent = xlsx.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]]);
        return await htmlToPDF(htmlContent);  // Convert the HTML output to PDF
    } catch (error) {
        console.error('Failed to convert Excel file to PDF', error);
        throw error;
    }
}

// Convert PowerPoint file to PDF using Puppeteer
async function convertPowerPointToPDF(buffer) {
    // You may need to convert PowerPoint to HTML or use a similar strategy to convert it to PDF
    // For now, assuming a generic approach using Puppeteer
    try {
        const htmlContent = '<html><body><h1>PowerPoint to PDF conversion coming soon...</h1></body></html>';  // Placeholder content
        return await htmlToPDF(htmlContent);
    } catch (error) {
        console.error('Failed to convert PowerPoint file to PDF', error);
        throw error;
    }
}

// Convert HTML content to PDF using Puppeteer
async function htmlToPDF(htmlContent) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdfBuffer;
}

// Extract PDF metadata
async function extractPDFMetadata(buffer) {
    try {
        const pdfDoc = await PDFDocument.load(buffer);
        return {
            pageCount: pdfDoc.getPageCount(),
            author: pdfDoc.getAuthor() || 'Unknown',
            creationDate: pdfDoc.getCreationDate() ? formatDate(pdfDoc.getCreationDate()) : todayDate,
            modificationDate: pdfDoc.getModificationDate() ? formatDate(pdfDoc.getModificationDate()) : todayDate
        };
    } catch (error) {
        console.error('Failed to extract PDF metadata', error);
        return {
            pageCount: 'Unknown',
            author: 'Unknown',
            creationDate: todayDate,
            modificationDate: todayDate
        };
    }
}

// Extract Word metadata using mammoth
async function extractWordMetadata(buffer) {
    try {
        const coreXmlFile = (await require('unzipper').Open.buffer(buffer)).files.find(file => file.path === 'docProps/core.xml');
        if (!coreXmlFile) throw new Error('core.xml not found in .docx file');
        const coreXmlString = (await coreXmlFile.buffer()).toString();
        const result = await require('xml2js').parseStringPromise(coreXmlString);
        const properties = result['cp:coreProperties'] || {};
        return {
            title: properties['dc:title']?.[0] || 'Unknown',
            author: properties['dc:creator']?.[0] || 'Unknown',
            creationDate: properties['dcterms:created']?.[0] ? formatDate(properties['dcterms:created'][0]) : todayDate,
            modificationDate: properties['dcterms:modified']?.[0] ? formatDate(properties['dcterms:modified'][0]) : todayDate,
            pageCount: Math.ceil((await mammoth.extractRawText({ buffer })).value.split('\n').length / 30)  // Rough estimate
        };
    } catch (error) {
        console.error('Failed to extract Word metadata', error);
        return {
            title: 'Unknown',
            author: 'Unknown',
            creationDate: todayDate,
            modificationDate: todayDate,
            pageCount: 'Unknown'
        };
    }
}
// Extract PowerPoint metadata
async function extractPowerPointMetadata(buffer) {
    try {
        const coreXmlFile = (await require('unzipper').Open.buffer(buffer)).files.find(file => file.path === 'docProps/core.xml');
        if (!coreXmlFile) {
            throw new Error('core.xml not found in .pptx file');
        }

        const coreXmlString = (await coreXmlFile.buffer()).toString();
        const result = await require('xml2js').parseStringPromise(coreXmlString);
        
        const properties = result['cp:coreProperties'] || {};
        
        return {
            title: properties['dc:title']?.[0] || 'Unknown',
            author: properties['dc:creator']?.[0] || 'Unknown',
            creationDate: properties['dcterms:created']?.[0] ? formatDate(properties['dcterms:created'][0]) : todayDate,
            modificationDate: properties['dcterms:modified']?.[0] ? formatDate(properties['dcterms:modified'][0]) : todayDate,
            slideCount: await countSlides(buffer)  // Count slides from the PowerPoint
        };
    } catch (error) {
        console.error('Failed to extract PowerPoint metadata', error);
        return {
            title: 'Unknown',
            author: 'Unknown',
            creationDate: todayDate,
            modificationDate: todayDate,
            slideCount: 'Unknown'
        };
    }
}

// Count slides in a PowerPoint presentation
async function countSlides(buffer) {
    try {
        const slideFiles = (await require('unzipper').Open.buffer(buffer)).files.filter(file => file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml'));
        return slideFiles.length;
    } catch (error) {
        console.error('Failed to count slides', error);
        throw new Error('Failed to count slides');
    }
}

// Extract Excel metadata using xlsx
async function extractExcelMetadata(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        return {
            pageCount: workbook.SheetNames.length,  // One page per sheet
            author: workbook.Props?.Creator || 'Unknown',
            creationDate: workbook.Props?.CreatedDate ? formatDate(workbook.Props.CreatedDate) : todayDate,
            modificationDate: workbook.Props?.ModifiedDate ? formatDate(workbook.Props.ModifiedDate) : todayDate
        };
    } catch (error) {
        console.error('Failed to extract Excel metadata', error);
        return {
            pageCount: 'Unknown',
            author: 'Unknown',
            creationDate: todayDate,
            modificationDate: todayDate
        };
    }
}

// Format date into a standard string format
function formatDate(date) {
    try {
        const d = new Date(date);
        return d.toISOString();  // ISO 8601 format
    } catch (error) {
        console.error('Failed to format date', error);
        return todayDate;  // Return today's date if formatting fails
    }
}

module.exports = { convertToPDF, extractPDFMetadata, extractWordMetadata, extractExcelMetadata, extractPowerPointMetadata };
