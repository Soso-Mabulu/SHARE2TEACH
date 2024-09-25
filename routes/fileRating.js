
const express = require('express');
const router = express.Router();
const connect = require('../config/db');
const sql = require('mssql');
const authorize = require('../middleware/authorize');

// Route to rate a document, authorized for users
router.post('/rate', authorize('public'), async (req, res) => {
    const { docId, userId, rating } = req.body;
   
    // Validate the rating
    if (rating < 0 || rating > 5) {
      return res.status(400).send('Rating must be between 0 and 5');
    }

    try {
      const pool = await connect();
  
      // Check if the document exists
      const docResult = await pool.request()
        .input('docId', sql.Int, docId)
        .query('SELECT * FROM APPROVED_DOCUMENT WHERE docId = @docId');
  
      if (docResult.recordset.length === 0) {
        return res.status(400).send('Document not found');
      }
  
      // Check if the user has already rated the document
      const ratingResult = await pool.request()
        .input('docId', sql.Int, docId)
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM RATING WHERE docId = @docId AND userId = @userId');
  
      if (ratingResult.recordset.length > 0) {
        return res.status(400).send('You cannot rate the same document more than once');
      }
  
      // Insert the rating in the RATING table
      await pool.request()
        .input('docId', sql.Int, docId)
        .input('userId', sql.Int, userId)
        .input('rating', sql.Int, rating)
        .query('INSERT INTO RATING (docId, userId, rating) VALUES (@docId, @userId, @rating)');
  
      // Update the average rating in the AVERAGE_RATING table
      await pool.request()
        .input('docId', sql.Int, docId)
        .query('MERGE AVERAGE_RATING AS target ' +
               'USING (SELECT docId, ROUND(AVG(rating), 2) AS averageRating FROM RATING WHERE docId = @docId GROUP BY docId) AS source ' +
               'ON (target.docId = source.docId) ' +
               'WHEN MATCHED THEN ' +
               'UPDATE SET averageRating = source.averageRating ' +
               'WHEN NOT MATCHED THEN ' +
               'INSERT (docId, averageRating) VALUES (source.docId, source.averageRating);');
  
      res.status(200).send('Rating added successfully');
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send('An error occurred');
    }
});

// Route to get all ratings, authorized for admins
router.get('/', authorize('admin'), async (req, res) => {
    try {
      const pool = await connect();
      const result = await pool.request().query('SELECT * FROM RATING');
      res.json(result.recordset);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).send(err);
    }
});

// Route to update a rating, authorized for users
router.put('/update', authorize('public'), async (req, res) => {
  const { docId, userId, rating } = req.body;
 
  // Validate the rating
  if (rating < 0 || rating > 5) {
    return res.status(400).send('Rating must be between 0 and 5');
  }

  try {
    const pool = await connect();

    // Check if the rating exists
    const ratingResult = await pool.request()
      .input('docId', sql.Int, docId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM RATING WHERE docId = @docId AND userId = @userId');

    if (ratingResult.recordset.length === 0) {
      return res.status(404).send('Rating not found');  // Updated error code to 404
    }

    // Update the rating in the RATING table
    await pool.request()
      .input('docId', sql.Int, docId)
      .input('userId', sql.Int, userId)
      .input('rating', sql.Int, rating)
      .query('UPDATE RATING SET rating = @rating WHERE docId = @docId AND userId = @userId');

    // Recalculate and update the average rating in the AVERAGE_RATING table
    const updateAverageRatingQuery = `
      UPDATE AVERAGE_RATING 
      SET averageRating = (
        SELECT ROUND(AVG(rating), 2) 
        FROM RATING 
        WHERE docId = @docId
      )
      WHERE docId = @docId;
    `;

    await pool.request()
      .input('docId', sql.Int, docId)
      .query(updateAverageRatingQuery);

    res.status(200).send('Rating updated successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('An error occurred while updating the rating');
  }
});


// Route to delete a rating, authorized for users
router.delete('/delete', authorize('public'), async (req, res) => {
  const { docId, userId } = req.body;

  try {
    const pool = await connect();

    // Delete the rating for the specific document and user
    const result = await pool.request()
      .input('docId', sql.Int, docId)
      .input('userId', sql.Int, userId)
      .query('DELETE FROM RATING WHERE docId = @docId AND userId = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send('Rating not found');
    }

    // Check if any ratings remain for this document
    const remainingRatings = await pool.request()
      .input('docId', sql.Int, docId)
      .query('SELECT COUNT(*) AS count FROM RATING WHERE docId = @docId');

    if (remainingRatings.recordset[0].count === 0) {
      // No more ratings, delete the average rating entry for this document
      await pool.request()
        .input('docId', sql.Int, docId)
        .query('DELETE FROM AVERAGE_RATING WHERE docId = @docId');
    } else {
      // Update the average rating based on remaining ratings
      await pool.request()
        .input('docId', sql.Int, docId)
        .query('UPDATE AVERAGE_RATING SET averageRating = (SELECT ROUND(AVG(rating), 2) FROM RATING WHERE docId = @docId) WHERE docId = @docId');
    }

    res.status(204).send("Document rating has been deleted");  // No content, operation successful
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});



module.exports = router;

