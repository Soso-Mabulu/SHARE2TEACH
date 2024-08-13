const { s3Upload } = require("../utils/s3");
const connection = require("../config/db");
const { checkUserRole } = require("../utils/roleCheck");

const uploadFiles = async (req, res) => {
    try {
        if (!req.files) {
            return res.status(400).json({ message: "No files uploaded" });
        }
        const { userId, module, description, university, category, academicYear } = req.body;

        checkUserRole(userId, (err, userRole) => {
            if (err) {
                console.error('Error querying user role:', err);
                return res.status(500).json({ message: "Failed to verify user role", error: err.message });
            }

            if (userRole !== 'educator' && userRole !== 'moderator') {
                return res.status(403).json({ message: "You do not have permission to upload files" });
            }
        });

        const results = await Promise.all(req.files.map(file => s3Upload(file)));

        results.forEach((url) => {
            const query = 'INSERT INTO Document (module, description, approved, location, university, category, academicYear) VALUES (?, ?, ?, ?, ?, ?, ?)';
            connection.query(query, [module, description, false, url, university, category, academicYear], (err, result) => {
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
