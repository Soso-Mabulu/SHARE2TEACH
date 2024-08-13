const express = require("express");
const upload = require("../middleware/multer");
const { uploadFiles } = require("../controllers/uploadController");
const router = express.Router();

router.post("/", upload.array("document"), uploadFiles);

module.exports = router;

