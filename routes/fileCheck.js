const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse'); // For PDF content validation

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      throw new Error('No file uploaded');
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (fileExtension !== '.pdf') {
      throw new Error('Invalid file type, only PDF files are allowed for uploading');
    }

    const fileSizeInBytes = fs.statSync(file.path).size;
    const maxSizeInBytes = 3 * 1024 * 1024; 
    if (fileSizeInBytes > maxSizeInBytes) {
      throw new Error('File size exceeds 3 MB limit');
    }

    const dataBuffer = fs.readFileSync(file.path);
    const data = await pdf(dataBuffer);
   
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error:', error);
    // for any errors that can be encountered but i can't see them.
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
