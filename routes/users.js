const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Import your MySQL config
const authorize = require('../middleware/authorize');

// Middleware to ensure only admins can access this route
router.use(authorize('admin'));

// GET /users - Retrieve all users
router.get('/', (req, res) => {
    db.query('SELECT userId, userName, email, userType FROM User', (err, results) => {
        if (err) {
            console.error('Error retrieving users:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.status(200).json(results);
    });
});

module.exports = router;
