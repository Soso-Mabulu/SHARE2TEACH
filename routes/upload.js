const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PutObjectCommand, GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../config'); // Ensure correct path to config file

const bucketName = 'file-storage1';

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Function to upload file to S3
const uploadFile = async (keyName, fileContent) => {
  const params = {
    Bucket: bucketName,
    Key: keyName,
    Body: fileContent,
    ContentType: 'application/pdf' // Set the content type for PDF files
  };

  try {
    // Use PutObjectCommand to upload file
    const putCommand = new PutObjectCommand(params);
    await s3.send(putCommand);
    
    // Generate URL
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: keyName
    });
    const fileUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 }); // URL valid for 5 minutes
    
    return fileUrl;
  } catch (err) {
    throw new Error('Error uploading file: ' + err.message);
  }
};

// POST route to upload file
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const keyName = req.file.originalname;
  const fileContent = req.file.buffer;
  try {
    const fileUrl = await uploadFile(keyName, fileContent);
    res.status(200).json({ fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
