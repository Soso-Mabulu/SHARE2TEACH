const express = require('express');
const router = express.Router();
const connectToDatabase = require('../config/db'); // Import your MySQL config
const authorize = require('../middleware/authorize');

// Middleware to ensure only admins can access this route
router.use(authorize('admin'));

// GET /users - Retrieve all users
router.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase(); // Establish the database connection
        const [results] = await db.query('SELECT userId, userName, email, userType FROM User');
        res.status(200).json(results);
    } catch (err) {
        console.error('Error retrieving users:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT /users/:userId - Update a user's type
router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { userType } = req.body;

    // Validate userType
    const validUserTypes = ['moderator', 'admin', 'public'];
    if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ message: 'Invalid user type provided' });
    }

    try {
        const db = await connectToDatabase(); // Establish the database connection
        const [results] = await db.query('UPDATE User SET userType = ? WHERE userId = ?', [userType, userId]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User type updated successfully' });
    } catch (err) {
        console.error('Error updating user type:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
