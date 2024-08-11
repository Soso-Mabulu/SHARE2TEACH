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

// PUT /users/:userId - Update a user's type
router.put('/:userId', (req, res) => {
    const { userId } = req.params;
    const { userType } = req.body;

    // Validate userType
    const validUserTypes = ['moderator', 'admin', 'public'];
    if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ message: 'Invalid user type provided' });
    }

    db.query('UPDATE User SET userType = ? WHERE userId = ?', [userType, userId], (err, results) => {
        if (err) {
            console.error('Error updating user type:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User type updated successfully' });
    });
});

module.exports = router;
