const express = require('express');
const router = express.Router();
const connectToDatabase = require('../config/db'); // Import your MSSQL config
const authorize = require('../middleware/authorize');

// Middleware to ensure only admins can access this route
router.use(authorize('admin'));

// GET /users - Retrieve all users
router.get('/', async (req, res) => {
    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();
        const result = await request.query('SELECT userId, userName, email, userType FROM [User]');
        
        res.status(200).json(result.recordset); // MSSQL returns the result in `recordset`
    } catch (err) {
        console.error('Error retrieving users:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (db) {
            db.close(); // Close the connection to prevent memory leaks
        }
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

    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();

        // Use parameterized queries to prevent SQL injection
        request.input('userType', userType);
        request.input('userId', userId);

        const result = await request.query('UPDATE [User] SET userType = @userType WHERE userId = @userId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User type updated successfully' });
    } catch (err) {
        console.error('Error updating user type:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (db) {
            db.close(); // Close the connection to prevent memory leaks
        }
    }
});

module.exports = router;
