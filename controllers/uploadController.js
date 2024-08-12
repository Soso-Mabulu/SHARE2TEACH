const { s3Upload } = require("../utils/s3");
const connection = require("../config/db");

const uploadFiles = async (req, res) => {
    try {
        if (!req.files) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const results = await Promise.all(req.files.map(file => s3Upload(file)));

        results.forEach((url) => {
            const query = 'INSERT INTO document (url) VALUES (?)';
            connection.query(query, [url], (err, result) => {
                if (err) {
                    console.error('Error inserting into MySQL:', err);
                }
            });
        });

        res.json({ status: "success", results });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "File upload failed", error: err.message });
    }
};

module.exports = { uploadFiles };
