const connectToDatabase = require('../config/db');

const checkUserRole = async (userId) => {
    const db = await connectToDatabase();
    try {
        console.log(`Checking role for userId: ${userId}`); // Debugging: Log userId
        const [rows] = await db.query('SELECT userType FROM User WHERE userId = ?', [userId]);
        if (rows.length === 0) {
            throw new Error('User not found');
        }
        return rows[0].userType;
    } catch (err) {
        console.error('Error in checkUserRole:', err);
        throw err;
    } finally {
        await db.end();
    }
};

module.exports = { checkUserRole };
