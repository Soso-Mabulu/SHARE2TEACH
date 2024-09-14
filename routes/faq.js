const express = require('express');
const router = express.Router();
const connect = require('../config/db');
const sql = require('mssql');
const authorize = require('../middleware/authorize');

// Get all FAQs
router.get('/', authorize(['public access user', 'admin']), async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT * FROM FAQ');
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Search FAQs 
router.get('/search', async (req, res) => {
  const { term } = req.query;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('term', sql.NVarChar, `%${term}%`)
      .query('SELECT * FROM FAQ WHERE question LIKE @term OR answer LIKE @term');
    res.json(result.recordset);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Get a single FAQ by ID (accessible by both users and admins)
/*router.get('/:faqId', authorize(['public access user', 'admin']), async (req, res) => {
  const { faqId } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('SELECT * FROM FAQ WHERE faqId = @faqId');
    if (result.recordset.length === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});
*/
// Create a new FAQ (admin only)
router.post('/newfaq', authorize('admin'), async (req, res) => {
  const { question, answer } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('question', sql.NVarChar, question)
      .input('answer', sql.NVarChar, answer)
      .query('INSERT INTO FAQ (question, answer) VALUES (@question, @answer); SELECT SCOPE_IDENTITY() AS id');
    res.status(201).json({ id: result.recordset[0].id, question, answer });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Update an FAQ (admin only)
router.put('/:faqId', authorize('admin'), async (req, res) => {
  const { faqId } = req.params;
  const { question, answer } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .input('question', sql.NVarChar, question)
      .input('answer', sql.NVarChar, answer)
      .query('UPDATE FAQ SET question = @question, answer = @answer WHERE faqId = @faqId');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.json({ faqId, question, answer });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

// Delete an FAQ (admin only)
router.delete('/:faqId', authorize('admin'), async (req, res) => {
  const { faqId } = req.params;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('DELETE FROM FAQ WHERE faqId = @faqId');
    if (result.rowsAffected[0] === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send(err);
  }
});

router.post('/rating/:faqId', authorize('public access user'), async (req, res) => {
  const { faqId } = req.params;
  const { userId, rating } = req.body;

  // Validate the rating
  if (rating < 0 || rating > 5) {
    return res.status(400).send('Rating must be between 0 and 5');
  }

  try {
    const pool = await connect();

    // Check if the FAQ exists
    const faqResult = await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('SELECT * FROM FAQ WHERE faqId = @faqId');

    if (faqResult.recordset.length === 0) {
      return res.status(404).send('FAQ not found');
    }

    // Check if the user exists
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM [USER] WHERE userId = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).send('User not found');
    }

    // Insert the rating into FAQ_RATING table
    await pool.request()
      .input('faqId', sql.Int, faqId)
      .input('userId', sql.Int, userId)
      .input('rating', sql.Int, rating)
      .query('INSERT INTO FAQ_RATING (faqId, userId, rating) VALUES (@faqId, @userId, @rating)');

    // Update the average rating in the FAQ table
    await pool.request()
      .input('faqId', sql.Int, faqId)
      .query('MERGE FAQ_AVERAGE_RATING AS target ' +
             'USING (SELECT faqId, AVG(rating) AS averageRating, COUNT(*) AS ratingCount FROM FAQ_RATING WHERE faqId = @faqId GROUP BY faqId) AS source ' +
             'ON (target.faqId = source.faqId) ' +
             'WHEN MATCHED THEN ' +
             'UPDATE SET averageRating = source.averageRating, ratingCount = source.ratingCount ' +
             'WHEN NOT MATCHED THEN ' +
             'INSERT (faqId, averageRating, ratingCount) VALUES (source.faqId, source.averageRating, source.ratingCount);');

    res.status(200).send('Rating submitted successfully');
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
