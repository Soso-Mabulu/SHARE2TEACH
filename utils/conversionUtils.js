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
        const styledHtmlContent = createStyledHtml(htmlContent, 'Word Document');

        return await htmlToPDF(styledHtmlContent);
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
            header: 1 
        });

        // Add styles to the HTML content
        const styledHtmlContent = createStyledHtml(htmlContent, 'Excel Sheet');

        return await htmlToPDF(styledHtmlContent);
    } catch (error) {
        console.error('Failed to convert Excel file to PDF', error);
        throw error;
    }
}

// Convert PowerPoint file to PDF using Puppeteer
async function convertPowerPointToPDF(buffer) {
    try {
        const pptx = await unzipper.Open.buffer(buffer);
        const slideFiles = pptx.files.filter(file => file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml'));
        const mediaFiles = pptx.files.filter(file => file.path.startsWith('ppt/media/'));

        if (slideFiles.length === 0) {
            throw new Error('No slides found in PowerPoint file');
        }

        let htmlContent = '<html><head>' + createSlideStyles() + '</head><body>';

        for (const [index, slideFile] of slideFiles.entries()) {
            const slideXml = await slideFile.buffer();
            const slideContent = await xml2js.parseStringPromise(slideXml);
            const slideText = extractSlideText(slideContent);
            const slideImages = extractSlideImages(slideContent, mediaFiles);

            htmlContent += `
                <div class="slide">
                    <h2>Slide ${index + 1}</h2>
                    <div class="slide-content">
                        <p>${slideText}</p>
                        ${slideImages.map(image => `<div class="image"><img src="data:image/png;base64,${image}" alt="Slide image" /></div>`).join('')}
                    </div>
                </div>`;
        }

        htmlContent += `
            <footer>&copy; 2024 Share2Teach. All rights reserved.</footer>
            <div class="page-number">Page 1</div>
            </body></html>`;

        return await htmlToPDF(htmlContent);
    } catch (error) {
        console.error('Failed to convert PowerPoint file to PDF', error);
        throw error;
    }
}

// Create styled HTML content
function createStyledHtml(content, title) {
    return `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 40px;
                    background-color: #f9f9f9;
                }
                h1, h2, h3 {
                    color: #333;
                    text-align: center;
                    margin: 40px 0 20px 0;
                }
                p {
                    line-height: 1.6;
                    margin: 15px 0;
                }
                footer {
                    text-align: center;
                    margin-top: 60px;
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
            <h1>${title}</h1>
            ${content}
        </body>
        </html>`;
}

// Slide styles for PowerPoint conversion
function createSlideStyles() {
    return `
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 40px;
                background-color: #f9f9f9;
            }
            .slide {
                border: 2px solid #000;
                padding: 20px;
                margin-bottom: 40px;
                page-break-after: always;
                background-color: white;
            }
            .slide h2 {
                color: #1E90FF;
                text-align: center;
                margin-bottom: 15px;
            }
            .slide-content {
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 20px;
            }
            .image {
                text-align: center;
                margin: 20px 0;
            }
            footer {
                text-align: center;
                margin-top: 60px;
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
        </style>`;
}

// Function to extract text from PowerPoint slide XML
function extractSlideText(slideContent) {
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

// Function to extract images from PowerPoint slide
const extractSlideImages = (slideContent, mediaFiles) => {
    const images = [];
    const drawingElements = slideContent['p:sld']?.['p:cSld']?.[0]['p:spTree']?.[0]['p:pic'];
    if (!drawingElements) return images;

    for (const drawingElement of drawingElements) {
        const embedRel = drawingElement['p:blipFill']?.[0]['a:blip']?.[0]['$']?.['r:embed'];
        if (embedRel) {
            const mediaFile = mediaFiles.find(file => file.path.includes(embedRel));
            if (mediaFile) {
                const mediaBuffer = mediaFile.buffer();
                const mediaBase64 = mediaBuffer.toString('base64');
                const mediaType = getMediaType(mediaFile.path);
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
            return 'application/octet-stream';
    }
}

// Convert HTML content to PDF using Puppeteer
async function htmlToPDF(htmlContent) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

// Extract Word metadata
async function extractWordMetadata(buffer) {
    try {
        const coreXmlFile = (await unzipper.Open.buffer(buffer)).files.find(file => file.path === 'docProps/core.xml');
        if (!coreXmlFile) throw new Error('core.xml not found in .docx file');
        const coreXmlString = (await coreXmlFile.buffer()).toString();
        const result = await xml2js.parseStringPromise(coreXmlString);
        const properties = result['cp:coreProperties'] || {};
        return {
            title: properties['dc:title']?.[0] || 'Unknown',
            author: properties['dc:creator']?.[0] || 'Unknown',
            creationDate: properties['dcterms:created']?.[0] ? formatDate(properties['dcterms:created'][0]) : todayDate,
            modificationDate: properties['dcterms:modified']?.[0] ? formatDate(properties['dcterms:modified'][0]) : todayDate,
            pageCount: Math.ceil((await mammoth.extractRawText({ buffer })).value.split('\n').length / 30)
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
        const coreXmlFile = (await unzipper.Open.buffer(buffer)).files.find(file => file.path === 'docProps/core.xml');
        if (!coreXmlFile) {
            throw new Error('core.xml not found in .pptx file');
        }

        const coreXmlString = (await coreXmlFile.buffer()).toString();
        const result = await xml2js.parseStringPromise(coreXmlString);
        
        const properties = result['cp:coreProperties'] || {};
        
        return {
            title: properties['dc:title']?.[0] || 'Unknown',
            author: properties['dc:creator']?.[0] || 'Unknown',
            creationDate: properties['dcterms:created']?.[0] ? formatDate(properties['dcterms:created'][0]) : todayDate,
            modificationDate: properties['dcterms:modified']?.[0] ? formatDate(properties['dcterms:modified'][0]) : todayDate,
            slideCount: await countSlides(buffer)
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
        const slideFiles = (await unzipper.Open.buffer(buffer)).files.filter(file => file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml'));
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
            pageCount: workbook.SheetNames.length,
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
