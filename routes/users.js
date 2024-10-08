const express = require('express');
const router = express.Router();
const connectToDatabase = require('../config/db'); // Import your MSSQL config
const authorize = require('../middleware/authorize');

// Middleware to ensure only admins can access certain routes
router.use(authorize(['admin', 'public', 'moderator', 'educator'])); // Adjusted for broader use

// GET /users - Admin only: Retrieve all users
router.get('/', authorize('admin'), async (req, res) => {
    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();
        const result = await request.query('SELECT userId, userName, userLName, email, userType FROM [User]');
        
        res.status(200).json(result.recordset); // MSSQL returns the result in `recordset`
    } catch (err) {
        console.error('Error retrieving users:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    } 
});

// PUT /update - Public, Moderator, Educator, Admin: Update own user details (excluding password)
router.put('/update', authorize(['public', 'moderator', 'educator', 'admin']), async (req, res) => {
    const userId = req.user.userId;  // Extract the userId from the token
    console.log(`Updating user with ID: ${userId}`); // Log the userId being updated
    const { userName, userLName, email } = req.body;

    // Initialize the update query parts
    const updateFields = [];
    const updateValues = {};

    // Check which fields are provided in the request body and add them to the query dynamically
    if (userName) {
        updateFields.push('userName = @userName');
        updateValues.userName = userName;
    }

    if (userLName) {
        updateFields.push('userLName = @userLName');
        updateValues.userLName = userLName;
    }

    if (email) {
        updateFields.push('email = @email');
        updateValues.email = email;
    }

    // Ensure there is at least one field to update
    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update provided' });
    }

    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();

        // Bind the parameters for the dynamic fields
        Object.keys(updateValues).forEach(key => {
            request.input(key, updateValues[key]);
        });
        request.input('userId', userId);

        // Dynamically construct the update query
        const updateQuery = `
            UPDATE [User]
            SET ${updateFields.join(', ')}
            WHERE userId = @userId
        `;

        console.log(`Executing update query: ${updateQuery}`); // Debugging statement

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            console.log(`User with ID ${userId} not found in database`); // Debugging statement
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User details updated successfully' });
    } catch (err) {
        console.error('Error updating user details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// PUT /users/:userId - Admin only: Update a user's type
router.put('/:userId', authorize('admin'), async (req, res) => {
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
    }
});

// DELETE /users/:userId - Admin only: Delete a user
router.delete('/:userId', authorize('admin'), async (req, res) => {
    const { userId } = req.params;

    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();

        request.input('userId', userId);
        const result = await request.query('DELETE FROM [User] WHERE userId = @userId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET /users/:userId - Retrieve user details by userId
router.get('/:userId', authorize(['public', 'moderator', 'educator', 'admin']), async (req, res) => {
    const { userId } = req.params;  // Extract userId from the route parameter

    let db;
    try {
        db = await connectToDatabase(); // Establish the database connection
        const request = db.request();

        // Use parameterized queries to prevent SQL injection
        request.input('userId', userId);

        // Fetch the user's details from the database
        const result = await request.query('SELECT userId, userName, userLName, email, userType FROM [User] WHERE userId = @userId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user details as a response
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error('Error retrieving user details:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


module.exports = router;
