const pdfParse = require('pdf-parse');
const { parseString } = require('xml2js');
const mammoth = require('mammoth'); // For DOCX to text conversion
const textract = require('textract'); // For extracting text from PPTX and images

// File handling version: Use dynamic import for 'node-fetch' because it's an ES module
async function processFile(attachment) {
    const fileType = attachment.contentType;
    const fileUrl = attachment.url;

    try {
        // Dynamically import 'node-fetch'
        const fetch = (await import('node-fetch')).default;

        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer(); // Convert to ArrayBuffer
        const buffer = Buffer.from(arrayBuffer);
        
        // File handling version: Handle PDFs
        if (fileType === 'application/pdf') {
            const data = await pdfParse(buffer);
            return data.text; // Return extracted text from the PDF
        }

        // File handling version: Handle DOCX (Microsoft Word files)
        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            return result.value; // Return extracted text from the DOCX
        }

        // File handling version: Handle PPTX (Microsoft PowerPoint files)
        if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            return new Promise((resolve, reject) => {
                textract.fromBufferWithMime(fileType, buffer, (error, text) => {
                    if (error) reject(error);
                    resolve(text); // Return extracted text from the PPTX
                });
            });
        }

        // File handling version: Handle images (JPEG, PNG)
        if (fileType.startsWith('image/')) {
            return new Promise((resolve, reject) => {
                textract.fromBufferWithMime(fileType, buffer, (error, text) => {
                    if (error) reject(error);
                    resolve(text); // Return extracted text from the image
                });
            });
        }

        // File handling version: If file type is unsupported
        return null; // Unsupported file type
    } catch (error) {
        console.error('Error processing file:', error);
        return null;
    }
}

module.exports = { processFile };