const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');  // For Word files
const xlsx = require('xlsx');  // For Excel files
const puppeteer = require('puppeteer');  // For rendering Excel and PowerPoint files to PDF
const unzipper = require('unzipper');
const xml2js = require('xml2js');

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

        // Add styles and structure to the HTML content
        const styledHtmlContent = `
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;  /* No margin on body */
                        padding: 40px;  /* Inner padding for content */
                        background-color: #f9f9f9;
                    }
                    h1, h2, h3 {
                        color: #333;
                        text-align: center;
                        margin-top: 40px;  /* Spacing above headings */
                        margin-bottom: 20px;  /* Spacing below headings */
                    }
                    p {
                        line-height: 1.6;
                        margin: 15px 0;  /* Spacing between paragraphs */
                    }
                    ul, ol {
                        margin: 15px 0 20px 30px;  /* Spacing for lists */
                        padding: 0;
                    }
                    blockquote {
                        border-left: 4px solid #ccc;
                        margin: 15px 0;
                        padding-left: 20px;
                        color: #555;
                        font-style: italic;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 20px auto;
                    }
                    footer {
                        text-align: center;
                        margin-top: 60px;  /* Space above footer */
                        font-size: 12px;
                        color: #777;
                    }
                    .page-number {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        font-size: 12px;
                        color: #aaa;
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
                <footer>
                    &copy; 2024 Share2Teach. All rights reserved.
                </footer>
                <div class="page-number">Page 1</div>  <!-- Page number -->
            </body>
            </html>
        `;

        return await htmlToPDF(styledHtmlContent);  // Convert the styled HTML output to PDF
    } catch (error) {
        console.error('Failed to convert Word file to PDF', error);
        throw error;
    }
}

// Convert Excel file to PDF using Puppeteer
async function convertExcelToPDF(buffer) {
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const htmlContent = xlsx.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]], { 
            id: 'excel-sheet', 
            header: 1 // Include header row
        });

        // Add styles to the HTML content
        const styledHtmlContent = `
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;  /* No margin on body */
                        padding: 40px;  /* Inner padding for content */
                        background-color: #f9f9f9;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 30px;  /* Space below the table */
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 12px;  /* Increased padding for better spacing */
                        text-align: left;
                    }
                    th {
                        background-color: #4CAF50;
                        color: white;
                    }
                    tr:nth-child(even) {
                        background-color: #f2f2f2;
                    }
                    tr:hover {
                        background-color: #ddd;
                    }
                    h1 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;  /* Space below the heading */
                    }
                    footer {
                        text-align: center;
                        margin-top: 60px;  /* Space above footer */
                        font-size: 12px;
                        color: #777;
                    }
                    .page-number {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        font-size: 12px;
                        color: #aaa;
                    }
                </style>
            </head>
            <body>
                <h1>Excel Sheet</h1>
                ${htmlContent}
                <footer>
                    &copy; 2024 Share2Teach. All rights reserved.
                </footer>
                <div class="page-number">Page 1</div>  <!-- Page number -->
            </body>
            </html>
        `;

        return await htmlToPDF(styledHtmlContent);  // Convert the styled HTML output to PDF
    } catch (error) {
        console.error('Failed to convert Excel file to PDF', error);
        throw error;
    }
}


// Convert PowerPoint file to PDF using Puppeteer
async function convertPowerPointToPDF(buffer) {
    try {
        // Unzip the PowerPoint file to access slide XML files and media assets (images, etc.)
        const pptx = await unzipper.Open.buffer(buffer);
        const slideFiles = pptx.files.filter(file => file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml'));
        const mediaFiles = pptx.files.filter(file => file.path.startsWith('ppt/media/'));

        if (slideFiles.length === 0) {
            throw new Error('No slides found in PowerPoint file');
        }

        // Collect slide content into HTML and style it nicely
        let htmlContent = `
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;  /* No margin on body */
                        padding: 40px;  /* Inner padding for content */
                        background-color: #f9f9f9;
                    }
                    .slide {
                        border: 2px solid #000;
                        padding: 20px;
                        margin-bottom: 40px;  /* Space between slides */
                        page-break-after: always;
                        background-color: white;  /* White background for each slide */
                    }
                    .slide h2 {
                        color: #1E90FF;
                        text-align: center;
                        margin-bottom: 15px;  /* Space below the heading */
                    }
                    .slide-content {
                        font-size: 16px;
                        line-height: 1.5;
                        margin-bottom: 20px;  /* Space below content */
                    }
                    .image {
                        text-align: center;
                        margin: 20px 0;
                    }
                    footer {
                        text-align: center;
                        margin-top: 60px;  /* Space above footer */
                        font-size: 12px;
                        color: #777;
                    }
                    .page-number {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        font-size: 12px;
                        color: #aaa;
                    }
                </style>
            </head>
            <body>
        `;

        for (const [index, slideFile] of slideFiles.entries()) {
            const slideXml = await slideFile.buffer();
            const slideContent = await xml2js.parseStringPromise(slideXml);

            // Basic structure for the slide
            htmlContent += `<div class="slide"><h2>Slide ${index + 1}</h2><div class="slide-content">`;

            // Extract text from slide XML
            const slideText = extractSlideText(slideContent);
            htmlContent += `<p>${slideText}</p>`;

            // Add media (images) if present
            const slideImages = extractSlideImages(slideContent, mediaFiles);
            slideImages.forEach(image => {
                htmlContent += `<div class="image"><img src="data:image/png;base64,${image}" alt="Slide image" /></div>`;
            });

            htmlContent += `</div></div>`;  // Close slide content
        }

        htmlContent += `
                <footer>
                    &copy; 2024 Share2Teach. All rights reserved.
                </footer>
                <div class="page-number">Page 1</div>  <!-- Placeholder for page number -->
            </body>
            </html>
        `;

        // Convert the HTML content to PDF using Puppeteer
        return await htmlToPDF(htmlContent);
    } catch (error) {
        console.error('Failed to convert PowerPoint file to PDF', error);
        throw error;
    }
}


// Function to extract text from PowerPoint slide XML (simplified, adjust to your needs)
function extractSlideText(slideContent) {
    // Find all <a:t> (text) tags inside the slide and return the combined text
    let text = '';
    if (slideContent['p:sld'] && slideContent['p:sld']['p:cSld']) {
        const shapes = slideContent['p:sld']['p:cSld'][0]['p:spTree'][0]['p:sp'];
        if (shapes) {
            shapes.forEach(shape => {
                const textNodes = shape['p:txBody']?.[0]['a:p']?.[0]['a:r']?.[0]['a:t'];
                if (textNodes) text += textNodes.join(' ') + '\n';
            });
        }
    }
    return text || 'No content found in this slide';
}

// Function to extract images (media) from PowerPoint slide
const extractSlideImages = (slideContent, mediaFiles) => {
    const images = [];

    // PowerPoint slide relationships point to media using r:embed attribute
    const drawingElements = slideContent['p:sld']?.['p:cSld']?.[0]['p:spTree']?.[0]['p:pic'];
    if (!drawingElements) return images;

    // Loop through all <p:pic> elements that represent pictures in the slide
    for (const drawingElement of drawingElements) {
        const embedRel = drawingElement['p:blipFill']?.[0]['a:blip']?.[0]['$']?.['r:embed'];
        if (embedRel) {
            // Find the corresponding media file based on the relationship
            const mediaFile = mediaFiles.find(file => file.path.includes(embedRel));
            if (mediaFile) {
                const mediaBuffer = mediaFile.buffer();
                const mediaBase64 = mediaBuffer.toString('base64');
                const mediaType = getMediaType(mediaFile.path);

                // Push image as base64 string to be rendered later
                images.push(`data:${mediaType};base64,${mediaBase64}`);
            }
        }
    }

    return images;
};

// Helper function to determine the MIME type of the image file
function getMediaType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'gif':
            return 'image/gif';
        default:
            return 'application/octet-stream'; // Fallback if unknown type
    }
}


// Convert HTML content to PDF using Puppeteer
async function htmlToPDF(htmlContent) {
    
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Add these arguments
    });
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
