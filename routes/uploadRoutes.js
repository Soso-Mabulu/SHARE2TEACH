const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { uploadFiles } = require('../controllers/uploadController');

// Configure Multer storage (for handling file uploads)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Allow multiple file types that can be converted to PDF
        const allowedTypes = [
            'application/pdf',
            'application/msword',  // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
            'application/vnd.ms-excel',  // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // .xlsx
            'application/vnd.ms-powerpoint',  // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',  // .pptx
            'image/jpeg',  // .jpg
            'image/png'   // .png
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Unsupported file type'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 }  // 10MB file size limit
});

// Define your route with middleware
router.post("/", authorize(['educator', 'moderator', 'admin']), upload.array("files"), uploadFiles);

module.exports = router;
