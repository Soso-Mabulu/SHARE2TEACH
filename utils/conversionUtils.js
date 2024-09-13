const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');  // For Word files
const xlsx = require('xlsx');  // For Excel files
const puppeteer = require('puppeteer');  // For HTML to PDF conversion
const unzipper = require('unzipper');  // For unzipping .pptx files
const xml2js = require('xml2js');  // For parsing XML

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

// Example PDF metadata extraction
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

// Convert Word to PDF
async function convertWordToPDF(buffer) {
    try {
        const result = await mammoth.convertToHtml({ buffer });
        return htmlToPDF(result.value);
    } catch (error) {
        console.error('Failed to convert Word to PDF', error);
        throw new Error('Failed to convert Word to PDF');
    }
}

// Extract Word metadata
async function extractWordMetadata(buffer) {
    try {
        const directory = await unzipper.Open.buffer(buffer);
        const coreXmlFile = directory.files.find(file => file.path === 'docProps/core.xml');
        
        if (!coreXmlFile) {
            throw new Error('core.xml not found in .docx file');
        }

        const coreXml = await coreXmlFile.buffer();
        const coreXmlString = coreXml.toString();
        const result = await xml2js.parseStringPromise(coreXmlString);
        
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

// Convert Excel to PDF
async function convertExcelToPDF(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const pdfBuffer = await convertExcelWorkbookToPDF(workbook);
        return pdfBuffer;
    } catch (error) {
        console.error('Failed to convert Excel to PDF', error);
        throw new Error('Failed to convert Excel to PDF');
    }
}

// Convert Excel workbook to PDF directly
async function convertExcelWorkbookToPDF(workbook) {
    // Direct conversion to PDF is not supported by xlsx
    // Alternative: convert to HTML and then to PDF
    const html = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_html(worksheet);
    }).join('<div style="page-break-after:always;"></div>');

    return htmlToPDF(html);
}

// Extract Excel metadata
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

// Convert PowerPoint to PDF
async function convertPowerPointToPDF(buffer) {
    try {
        const slides = await extractPowerPointSlides(buffer);
        const pdfBuffer = await slidesToPDF(slides);
        return pdfBuffer;
    } catch (error) {
        console.error('Failed to convert PowerPoint to PDF', error);
        throw new Error('Failed to convert PowerPoint to PDF');
    }
}

// Extract PowerPoint metadata
async function extractPowerPointMetadata(buffer) {
    try {
        const directory = await unzipper.Open.buffer(buffer);
        const coreXmlFile = directory.files.find(file => file.path === 'docProps/core.xml');

        if (!coreXmlFile) {
            throw new Error('core.xml not found in .pptx file');
        }

        const coreXml = await coreXmlFile.buffer();
        const coreXmlString = coreXml.toString();
        const result = await xml2js.parseStringPromise(coreXmlString);
        
        const properties = result['cp:coreProperties'] || {};
        
        return {
            title: properties['dc:title']?.[0] || 'Unknown',
            author: properties['dc:creator']?.[0] || 'Unknown',
            creationDate: properties['dcterms:created']?.[0] ? formatDate(properties['dcterms:created'][0]) : todayDate,
            modificationDate: properties['dcterms:modified']?.[0] ? formatDate(properties['dcterms:modified'][0]) : todayDate,
            slideCount: await countSlides(directory)  // Count slides from the PowerPoint
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

// Helper function to extract PowerPoint slides
async function extractPowerPointSlides(buffer) {
    try {
        const slides = [];
        const directory = await unzipper.Open.buffer(buffer);
        const slideFiles = directory.files.filter(file => file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml'));
        
        for (const file of slideFiles) {
            const content = await file.buffer();
            const xml = content.toString();
            const result = await xml2js.parseStringPromise(xml);
            
            // Basic conversion example; refine based on actual content
            const slideContent = result['p:sld']['p:cSld'][0]['p:spTree'][0];
            slides.push(slideContent);  // Directly push XML content for further processing
        }
        
        return slides;
    } catch (error) {
        console.error('Failed to extract PowerPoint slides', error);
        throw new Error('Failed to extract PowerPoint slides');
    }
}

// Convert slides to PDF directly
async function slidesToPDF(slides) {
    // Convert slides to PDF directly is complex and usually needs a specialized library
    // This placeholder function assumes further processing is required
    const html = slides.map(slide => `<div>${JSON.stringify(slide)}</div>`).join('<div style="page-break-after:always;"></div>');
    return htmlToPDF(html);
}

// Convert HTML to PDF using Puppeteer
async function htmlToPDF(html) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf();
        await browser.close();
        return pdfBuffer;
    } catch (error) {
        console.error('Failed to convert HTML to PDF', error);
        throw new Error('Failed to convert HTML to PDF');
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
