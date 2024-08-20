// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateToken = require('../middleware/auth');
const authorize = require('../middleware/authorize'); // Import your authorize middleware
const { uploadFiles } = require('../controllers/uploadController');

// Configure Multer storage (for handling file uploads)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }  // 5MB file size limit
});

// Define your route with middleware
router.post("/", authorize(['educator', 'moderator', 'admin']), upload.array("files"), uploadFiles);

module.exports = router;
