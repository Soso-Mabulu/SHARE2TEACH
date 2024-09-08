const express = require('express');
const router = express.Router();
const connectToDatabase = require('../config/db'); 

// Endpoint to submit a rating
router.post('/rate', async (req, res) => {
    const { userId, docId, rating } = req.body;

    if (rating < 0 || rating > 5) {
        return res.status(400).send('Invalid rating value');
    }

    try {
        const pool = await connectToDatabase();// Ensure the pool is connected
        const request = pool.request();
        const result = await request.query(`SELECT * FROM RATING WHERE userId = '${userId}' AND docId = '${docId}'`);
        if (result.recordset.length > 0) {
            return res.status(400).send('User has already rated this file');
        }

        await pool.query(`INSERT INTO RATING (userId, docId, rating) VALUES ('${userId}', '${docId}', ${rating})`);
        res.status(200).send('Rating submitted successfully');
    } catch (err) {
        console.error('Error submitting rating: ', err);
        res.status(500).send('Server error');
    }
});

// Endpoint to retrieve average rating for a file
router.get('/ratings/:docId', async (req, res) => {
    const { docId } = req.params;

    try {
        // Ensure the pool is connected
        const pool = await connectToDatabase();
        const request = pool.request();
        const result = await request.query(`SELECT AVG(rating) as averageRating FROM RATING WHERE docId = '${docId}'`);
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error('Error retrieving ratings: ', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
