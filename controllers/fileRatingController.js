const express = require('express');
const router = express.Router();
const connect = require('../config/db');
const sql = require('mssql');
const authorize = require('../middleware/authorize');

const getAllRatings = async (req, res) => {
    try {
        const pool = await connect();
        const result = await pool.request().query('SELECT * FROM RATING');
        res.json(result.recordset);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'An error occurred while fetching ratings' });
    }
};

// Helper function to validate the rating
const validateRating = (rating) => rating >= 0 && rating <= 5;

// Controller to rate a document
const rateDocument = async (req, res) => {
    const { docId, userId, rating } = req.body;

    if (!validateRating(rating)) {
        return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    try {
        const pool = await connect();
        console.log('User ID:', userId); // Log userId
        console.log('Document ID:', docId); // Log docId

        const docResult = await pool.request()
            .input('docId', sql.Int, docId)
            .query('SELECT * FROM APPROVED_DOCUMENT WHERE docId = @docId');

        if (docResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const ratingResult = await pool.request()
            .input('docId', sql.Int, docId)
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM RATING WHERE docId = @docId AND userId = @userId');

        if (ratingResult.recordset.length > 0) {
            return res.status(400).json({ error: 'You cannot rate the same document more than once' });
        }

        await pool.request()
            .input('docId', sql.Int, docId)
            .input('userId', sql.Int, userId)
            .input('rating', sql.Int, rating)
            .query('INSERT INTO RATING (docId, userId, rating) VALUES (@docId, @userId, @rating)');

        // Update the average rating
        await pool.request()
            .input('docId', sql.Int, docId)
            .query('MERGE AVERAGE_RATING AS target ' +
                'USING (SELECT docId, ROUND(AVG(rating), 2) AS averageRating FROM RATING WHERE docId = @docId GROUP BY docId) AS source ' +
                'ON (target.docId = source.docId) ' +
                'WHEN MATCHED THEN ' +
                'UPDATE SET averageRating = source.averageRating ' +
                'WHEN NOT MATCHED THEN ' +
                'INSERT (docId, averageRating) VALUES (source.docId, source.averageRating);');

        res.status(200).json({ message: 'Rating added successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'An error occurred while adding the rating' });
    }
};


// Controller to update a rating
const updateRating = async (req, res) => {
    const { docId, userId, rating } = req.body;

    if (!validateRating(rating)) {
        return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    try {
        const pool = await connect();
       

        const ratingResult = await pool.request()
            .input('docId', sql.Int, docId)
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM RATING WHERE docId = @docId AND userId = @userId');

        if (ratingResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Rating not found' });
        }

        await pool.request()
            .input('docId', sql.Int, docId)
            .input('userId', sql.Int, userId)
            .input('rating', sql.Int, rating)
            .query('UPDATE RATING SET rating = @rating WHERE docId = @docId AND userId = @userId');

        await pool.request()
            .input('docId', sql.Int, docId)
            .query(`UPDATE AVERAGE_RATING 
                    SET averageRating = (
                        SELECT ROUND(AVG(rating), 2) 
                        FROM RATING 
                        WHERE docId = @docId
                    )
                    WHERE docId = @docId;`);

        res.status(200).json({ message: 'Rating updated successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'An error occurred while updating the rating' });
    }
};

// Controller to delete a rating
const deleteRating = async (req, res) => {
    const { docId, userId } = req.body;

    try {
        const pool = await connect();

        const result = await pool.request()
            .input('docId', sql.Int, docId)
            .input('userId', sql.Int, userId)
            .query('DELETE FROM RATING WHERE docId = @docId AND userId = @userId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Rating not found' });
        }

        const remainingRatings = await pool.request()
            .input('docId', sql.Int, docId)
            .query('SELECT COUNT(*) AS count FROM RATING WHERE docId = @docId');

        if (remainingRatings.recordset[0].count === 0) {
            await pool.request()
                .input('docId', sql.Int, docId)
                .query('DELETE FROM AVERAGE_RATING WHERE docId = @docId');
        } else {
            await pool.request()
                .input('docId', sql.Int, docId)
                .query(`UPDATE AVERAGE_RATING 
                        SET averageRating = (
                            SELECT ROUND(AVG(rating), 2) 
                            FROM RATING 
                            WHERE docId = @docId
                        ) 
                        WHERE docId = @docId;`);
        }

        res.status(204).send("Rating has been deleted successfully");
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'An error occurred while deleting the rating' });
    }
};

module.exports = {
    rateDocument,
    updateRating,
    deleteRating,
    getAllRatings
};
